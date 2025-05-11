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

# Common system configuration, should change very infrequently
RUN \
    # Default to 3 retries for apt-get acquire's.
    # Remove in apt 2.3.2 where 3 tries is default.
    # Ref: https://askubuntu.com/questions/875213/apt-get-to-retry-downloading
    echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries && \
    # Set timezone to UTC
    echo "UTC" > /etc/timezone

# Old-releases for 21.04
COPY sources.list /etc/apt/sources.list

# Build-time dependencies
RUN apt-get -qq update && \
    apt-get -qq install -y --no-install-recommends curl && \
    apt-get install -y ca-certificates gnupg

# Node.js deb source
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get -qq update && \
    apt-get -qq install -y nodejs

# Install Python3, GDAL, PDAL, nginx, letsencrypt, psql
RUN apt-get -qq update && \
    apt-get -qq install -y --no-install-recommends python3 python3-pip python3-setuptools python3-wheel git g++ python3-dev python2.7-dev libpq-dev binutils libproj-dev gdal-bin pdal libgdal-dev python3-gdal nginx certbot gettext-base cron postgresql-client-13 gettext tzdata && \
    # Python2 with priority 1
    update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && \
    # Python3 with priority 2 (default)
    update-alternatives --install /usr/bin/python python /usr/bin/python3.9 2 && \
    # Install pip
    pip install pip==24.0

#### App-dependent setup ####

# Create and change into working directory
WORKDIR $WORKDIR

# Install Python requirements
COPY requirements.txt ./
RUN pip install -r requirements.txt "boto3==1.14.14"

# Cleanup of build requirements
RUN apt-get remove -y g++ python3-dev libpq-dev && apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Setup cron
COPY --chmod=0644 nginx/crontab ./nginx/crontab
RUN ln -s ./nginx/crontab /var/spool/cron/crontabs/root

# Install project Node dependencies
COPY package.json ./
RUN npm install --quiet

# Copy remaining files
COPY . ./

# NodeODM setup
RUN chmod +x ./nginx/letsencrypt-autogen.sh && \
    ./nodeodm/setup.sh && \
    ./nodeodm/cleanup.sh

# Install and run webpack build
# Note webpack CLI is also used in `rebuildplugins` below
RUN npm install --quiet -g webpack@5.89.0 && \
    npm install --quiet -g webpack-cli@5.1.4 && \
    webpack --mode production

# Django setup
RUN python manage.py collectstatic --noinput && \
    python manage.py rebuildplugins && \
    python manage.py translate build --safe

# Final cleanup
RUN rm -rf /tmp/* /var/tmp/* && \
    # Remove auto-generated secret key (happens on import of settings when none is defined)
    rm /webodm/webodm/secret_key.py

VOLUME /webodm/app/media
