# Base image
FROM ubuntu:21.04

# Maintainer information
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

# Build-time variables
ARG TEST_BUILD
ARG DEBIAN_FRONTEND=noninteractive

# Environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm
ENV PROJ_LIB=/usr/share/proj

# Prepare directory structure
ADD . /webodm/
WORKDIR /webodm

# Update sources to old releases for Ubuntu 21.04
RUN echo "Updating sources list for Ubuntu 21.04 old releases" && \
    printf "deb http://old-releases.ubuntu.com/ubuntu/ hirsute main restricted\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates main restricted\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute universe\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates universe\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute multiverse\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates multiverse\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-backports main restricted universe multiverse" > /etc/apt/sources.list

# Install Node.js
RUN echo "Installing Node.js" && \
    apt-get -qq update && \
    apt-get -qq install -y --no-install-recommends wget curl ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    NODE_MAJOR=20 && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get -qq update && \
    apt-get -qq install -y nodejs

# Install main packages: Python3, GDAL, PDAL, Nginx, LetsEncrypt, Postgresql
RUN echo "Installing Python3, GDAL, PDAL, Nginx, LetsEncrypt, Postgresql" && \
    apt-get -qq update && \
    apt-get -qq install -y --no-install-recommends python3 python3-pip python3-setuptools python3-wheel git g++ python3-dev python2.7-dev libpq-dev binutils libproj-dev gdal-bin pdal libgdal-dev python3-gdal nginx certbot gettext-base cron postgresql-client-13 gettext tzdata && \
    update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.9 2

# Install Python requirements
RUN echo "Installing Python dependencies" && \
    pip install -U pip && \
    pip install -r requirements.txt "boto3==1.14.14"

# Configure cron, time zone, and static files
RUN echo "Configuring cron, timezone, and static files" && \
    ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && chmod 0644 /webodm/nginx/crontab && service cron start && \
    chmod +x /webodm/nginx/letsencrypt-autogen.sh && \
    /webodm/nodeodm/setup.sh && /webodm/nodeodm/cleanup.sh && \
    npm install --quiet -g webpack@5.89.0 && npm install --quiet -g webpack-cli@5.1.4 && npm install --quiet && webpack --mode production && \
    echo "UTC" > /etc/timezone && \
    python manage.py collectstatic --noinput && \
    python manage.py rebuildplugins && \
    python manage.py translate build --safe

# Cleanup to reduce image size
RUN echo "Cleaning up unnecessary files" && \
    apt-get remove -y g++ python3-dev libpq-dev && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm /webodm/webodm/secret_key.py

# Volume for media files
VOLUME /webodm/app/media
