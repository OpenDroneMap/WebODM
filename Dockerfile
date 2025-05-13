# syntax=docker/dockerfile:1
FROM ubuntu:21.04
LABEL maintainer="Piero Toffanin <pt@masseranolabs.com>"

ARG TEST_BUILD
ARG DEBIAN_FRONTEND=noninteractive

ENV WORKDIR=/webodm
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=$WORKDIR
ENV PROJ_LIB=/usr/share/proj
ENV NODE_MAJOR=20

#### Common setup ####

# Old-releases for 21.04
COPY <<EOF /etc/apt/sources.list
deb http://old-releases.ubuntu.com/ubuntu/ hirsute main restricted
deb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates main restricted
deb http://old-releases.ubuntu.com/ubuntu/ hirsute universe
deb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates universe
deb http://old-releases.ubuntu.com/ubuntu/ hirsute multiverse
deb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates multiverse
deb http://old-releases.ubuntu.com/ubuntu/ hirsute-backports main restricted universe multiverse
EOF

# Create and change into working directory
WORKDIR $WORKDIR

# Install Python deps -- install & remove cleanup build-only deps in the process
COPY requirements.txt ./

# Allow multi-line runs, break on errors and output commands for debugging.
# The following does not work in Podman unless you build in Docker
# compatibility mode: <https://github.com/containers/podman/issues/8477>
# You can manually prepend every RUN script with `set -ex` too.
SHELL ["sh", "-exc"]

RUN <<EOT
    # Common system configuration, should change very infrequently
    # Default to 3 retries for apt-get acquire's.
    # Remove in apt 2.3.2 where 3 tries is default.
    # Ref: https://askubuntu.com/questions/875213/apt-get-to-retry-downloading
    echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries
    # Set timezone to UTC
    echo "UTC" > /etc/timezone
    # Build-time dependencies
    apt-get -qq update
    apt-get -qq install -y --no-install-recommends curl
    apt-get install -y ca-certificates gnupg
    # Node.js deb source
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    # Update package list
    apt-get -qq update
    # Install common deps, starting with NodeJS
    apt-get -qq install -y nodejs
    # Python3, GDAL, PDAL, nginx, letsencrypt, psql
    apt-get -qq install -y --no-install-recommends \
        python3 python3-pip python3-setuptools python3-wheel git binutils libproj-dev gdal-bin pdal \
        libgdal-dev python3-gdal nginx certbot gettext-base cron postgresql-client-13 gettext tzdata
    # Python3 with priority 1 (default)
    update-alternatives --install /usr/bin/python python /usr/bin/python3.9 1
    # Install pip
    pip install pip==24.0
    # Install webpack, webpack CLI
    # Note webpack CLI is also used in `rebuildplugins` below
    npm install --quiet -g webpack@5.89.0
    npm install --quiet -g webpack-cli@5.1.4
    # Build-only deps
    apt-get -qq install -y --no-install-recommends g++ python3-dev libpq-dev
    # Install Python requirements
    pip install -r requirements.txt "boto3==1.14.14"
    # Cleanup of build requirements
    apt-get remove -y g++ python3-dev libpq-dev
    apt-get autoremove -y
    apt-get clean
    rm -rf /var/lib/apt/lists/*
    # Remove stale temp files
    rm -rf /tmp/* /var/tmp/*
EOT

# Install project Node dependencies
COPY package.json ./
RUN npm install --quiet

# Copy remaining files
COPY . ./

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
    rm -rf /tmp/* /var/tmp/*
    # Remove auto-generated secret key (happens on import of settings when none is defined)
    rm /webodm/webodm/secret_key.py
EOT

VOLUME /webodm/app/media
