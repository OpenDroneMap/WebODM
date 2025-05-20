# syntax=docker/dockerfile:1
FROM ubuntu:22.04 AS common
LABEL maintainer="Piero Toffanin <pt@masseranolabs.com>"

# Build-time variables
ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_MAJOR=20
ARG PYTHON_VERSION=3.9
ARG RELEASE_CODENAME=jammy
ARG WORKDIR=/webodm

# Run-time variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=$WORKDIR
ENV PROJ_LIB=/usr/share/proj

#### Common setup ####

# Create and change into working directory
WORKDIR $WORKDIR

# Allow multi-line runs, break on errors and output commands for debugging.
# The following does not work in Podman unless you build in Docker
# compatibility mode: <https://github.com/containers/podman/issues/8477>
# You can manually prepend every RUN script with `set -ex` too.
SHELL ["sh", "-exc"]

RUN <<EOT
    # Common system configuration, should change very infrequently
    # Set timezone to UTC
    echo "UTC" > /etc/timezone
EOT

FROM common AS build

# Install Python deps -- install & remove cleanup build-only deps in the process
COPY requirements.txt ./

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    <<EOT
    # Build-time dependencies
    apt-get -qq update
    apt-get install -y --no-install-recommends curl ca-certificates gnupg
    # Python 3.9 support
    curl -fsSL 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xf23c5a6cf475977595c89f51ba6932366a755776' | gpg --dearmor -o /etc/apt/trusted.gpg.d/deadsnakes.gpg
    echo "deb http://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu $RELEASE_CODENAME main" > /etc/apt/sources.list.d/deadsnakes.list
    # Node.js deb source
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/trusted.gpg.d/nodesource.gpg
    echo "deb https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    # Update package list
    apt-get update
    # Install common deps, starting with NodeJS
    apt-get -qq install -y nodejs
    # Python3.9, GDAL, PDAL, nginx, letsencrypt, psql
    apt-get install -y --no-install-recommends \
        python$PYTHON_VERSION python$PYTHON_VERSION-venv python$PYTHON_VERSION-dev libpq-dev build-essential git libproj-dev gdal-bin pdal \
        libgdal-dev nginx certbot gettext-base cron postgresql-client gettext tzdata
    # Create virtualenv
    python$PYTHON_VERSION -m venv $WORKDIR/venv
EOT

# Modify PATH to prioritize venv, effectively activating venv
ENV PATH="$WORKDIR/venv/bin:$PATH"

RUN --mount=type=cache,target=/root/.cache/pip \
    <<EOT
    # Install Python dependencies
    # Install pip
    pip install pip==24.0
    # Install Python requirements, including correct Python GDAL bindings.
    pip install -r requirements.txt "boto3==1.14.14" gdal[numpy]=="$(gdal-config --version).*"
EOT

# Install project Node dependencies
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    <<EOT
    npm install --quiet
    # Install webpack, webpack CLI
    npm install --quiet -g webpack@5.89.0
    npm install --quiet -g webpack-cli@5.1.4
EOT

COPY nginx ./nginx
RUN <<EOT
    # nginx setup
    chmod 0644 ./nginx/crontab
    ln -s ./nginx/crontab /var/spool/cron/crontabs/root
    chmod +x ./nginx/letsencrypt-autogen.sh
EOT

# Defining this here allows for caching of previous layers.
ARG TEST_BUILD

COPY nodeodm ./nodeodm
RUN <<EOT
    # Setup NodeODM (only relevant in TEST_BUILD).
    ./nodeodm/setup.sh
    ./nodeodm/cleanup.sh
EOT

# Copy Python code
COPY webodm ./webodm
COPY app ./app
COPY worker ./worker
COPY manage.py ./

# Compile Python code
RUN python -m compileall .

# Collect static files
RUN python manage.py collectstatic --noinput

# Rebuild plugins
COPY coreplugins ./coreplugins
RUN python manage.py rebuildplugins

# Render translations
COPY LOCALES ./
COPY locale ./locale
RUN python manage.py translate build --safe

# Webpack build of app
COPY webpack.config.js ./
RUN webpack --mode production

# Remove stale temp files and auto-generated secret key (happens on import of settings when none is defined)
RUN rm -rvf /tmp/* /var/tmp/* /webodm/webodm/secret_key.py

# Remaining remaining files from /
COPY . ./

FROM common AS app

# Modify PATH to prioritize venv, effectively activating venv
ENV PATH="$WORKDIR/venv/bin:$PATH"

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    --mount=type=cache,target=/root/.npm \
    <<EOT
    # Run-time dependencies
    apt-get -qq update
    apt-get install -y --no-install-recommends curl ca-certificates gnupg
    # Legacy Python support
    curl -fsSL 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xf23c5a6cf475977595c89f51ba6932366a755776' | gpg --dearmor -o /etc/apt/trusted.gpg.d/deadsnakes.gpg
    echo "deb http://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu $RELEASE_CODENAME main" > /etc/apt/sources.list.d/deadsnakes.list
    # Node.js deb source
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/trusted.gpg.d/nodesource.gpg
    echo "deb https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    # Update package list
    apt-get update
    # Install common deps, starting with NodeJS
    apt-get -qq install -y nodejs
    # Python, GDAL, PDAL, nginx, letsencrypt, psql
    apt-get install -y --no-install-recommends \
        python$PYTHON_VERSION python$PYTHON_VERSION-distutils gdal-bin pdal \
        nginx certbot gettext-base cron postgresql-client gettext tzdata
    # Install webpack, webpack CLI
    npm install --quiet -g webpack@5.89.0
    npm install --quiet -g webpack-cli@5.1.4
    # Cleanup of build requirements
    apt-get autoremove -y
    apt-get clean
    rm -rf /var/lib/apt/lists/*
    # Remove stale temp files
    rm -rf /tmp/* /var/tmp/*
EOT

ARG APP_USER=webodm
ARG APP_GROUP=webodm
ARG APP_UID=1000
ARG APP_GID=1000

# Create webodm user, group and home directory
RUN <<EOT
    # Create user and group
    groupadd -g $APP_GID $APP_GROUP
    useradd -u $APP_UID -g $APP_GID -s /usr/sbin/nologin -d $WORKDIR $APP_USER
    chown $APP_USER:$APP_GROUP $WORKDIR
EOT

# Copy from builder stage to runtime stage
COPY --chown=$APP_USER:$APP_GROUP --chmod=755 --from=build $WORKDIR ./

USER $APP_USER

VOLUME /webodm/app/media
