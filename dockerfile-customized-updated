FROM ubuntu:20.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ARG TEST_BUILD

ARG DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED 1

# This makes the system use python2.x as default, which is not what we want
# ENV PYTHONPATH $PYTHONPATH:/webodm

# ENV PROJ_LIB=/usr/share/proj

# Why can’t rasterio find proj.db (rasterio from PyPI versions >= 1.2.0)?
# Starting with version 1.2.0, rasterio wheels on PyPI include PROJ 7.x and GDAL 3.x. The libraries and modules in these wheels are incompatible with older versions of PROJ that may be installed on your system. If PROJ_LIB (PROJ < 9.1) | PROJ_DATA (PROJ 9.1+) is set in your program’s environment and points to an older version of PROJ, you must unset this variable. Rasterio will then use the version of PROJ contained in the wheel.

# Prepare directory
ADD . /webodm/
WORKDIR /webodm

# # Changing DNS to Google's
# RUN printf "nameserver 8.8.8.8" > /etc/resolv.conf

# # Use old-releases for 21.04
# RUN printf "deb http://old-releases.ubuntu.com/ubuntu/ hirsute main restricted\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates main restricted\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute universe\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates universe\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute multiverse\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates multiverse\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-backports main restricted universe multiverse" > /etc/apt/sources.list

# Change mirror to speed up build
RUN sed -i 's/htt[p|ps]:\/\/archive.ubuntu.com\/ubuntu\//mirror:\/\/mirrors.ubuntu.com\/mirrors.txt/g' /etc/apt/sources.list

# Update and install basic required packages
RUN apt-get update && apt-get upgrade
# Changed manual installation of g++ to build-essentials
RUN apt-get install --fix-missing -y --no-install-recommends git build-essential libpq-dev binutils libproj-dev wget curl ca-certificates gnupg

# Configure Node.js repository
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    NODE_MAJOR=20 && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

# Install Node.js
RUN apt-get update && apt-get install -y nodejs

# Install Python
RUN apt-get update
RUN apt-get update && apt-get install -y software-properties-common && \
    add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y --fix-missing  python3.9 python3-pip python3-setuptools python3-wheel python3.9-dev 


# Install GDAL and others
RUN apt-get install -y --no-install-recommends gdal-bin pdal libgdal-dev python3-gdal 

# Install postgress
RUN apt install -y vim bash-completion wget 
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt-get update && apt-get install -y lsb-release
RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list

RUN apt update
RUN apt install -y postgresql-client-13
RUN apt-get install -y --no-install-recommends nginx certbot gettext-base cron postgresql-client-13 gettext tzdata

# # Set Python alternatives
# RUN update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && \
#     update-alternatives --install /usr/bin/python python /usr/bin/python3.9 2

# Install Python packages
# RUN pip install --upgrade pip
RUN python3.9 -m pip install --upgrade pip
# RUN pip install -r requirements.txt
RUN pip install -r requirements.txt

# Setup cron
RUN ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && \
    chmod 0644 /webodm/nginx/crontab && \
    service cron start && \
    chmod +x /webodm/nginx/letsencrypt-autogen.sh

# Setup NodeODM and install JavaScript dependencies
RUN /webodm/nodeodm/setup.sh && \
    /webodm/nodeodm/cleanup.sh && \
    cd /webodm && \
    npm install --quiet -g webpack@5.89.0 && \
    npm install --quiet -g webpack-cli@5.1.4 && \
    npm install --quiet && \
    webpack --mode production

# Configure timezone
RUN echo "UTC" > /etc/timezone

# Django setup
RUN python3.9 manage.py collectstatic --noinput && \
    python3.9 manage.py rebuildplugins && \
    python3.9 manage.py translate build --safe

# Cleanup
RUN apt-get remove -y g++ python3-dev libpq-dev && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm /webodm/webodm/secret_key.py

# alias python to python3.9
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.9 1
RUN alias python=python3.9

VOLUME /webodm/app/media
