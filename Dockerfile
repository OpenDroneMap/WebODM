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

# Copy remaining files
COPY . ./

# Defining this here allows for caching of previous layers.
ARG TEST_BUILD

RUN <<EOT
    # Final build steps (in one roll to prevent too many layers).
    # Setup cron
    chmod 0644 ./nginx/crontab
    ln -s ./nginx/crontab /var/spool/cron/crontabs/root
    # NodeODM setup
    chmod +x ./nginx/letsencrypt-autogen.sh
    ./nodeodm/setup.sh
    ./nodeodm/cleanup.sh
    # Run webpack build, Django setup and final cleanup
    webpack --mode production
    # Django setup
    python manage.py collectstatic --noinput
    python manage.py rebuildplugins
    python manage.py translate build --safe
    # Final cleanup
    # Remove stale temp files
    rm -rf /tmp/* /var/tmp/*
    # Remove auto-generated secret key (happens on import of settings when none is defined)
    rm /webodm/webodm/secret_key.py
EOT

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
    # Python, GDAL, PDAL, nginx, letsencrypt, psql, git
    apt-get install -y --no-install-recommends \
        python$PYTHON_VERSION python$PYTHON_VERSION-distutils gdal-bin pdal \
        nginx certbot gettext-base cron postgresql-client gettext tzdata git
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

COPY --from=build $WORKDIR ./

VOLUME /webodm/app/media
