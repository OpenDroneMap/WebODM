FROM ubuntu:21.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ARG TEST_BUILD
ARG DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm
ENV PROJ_LIB=/usr/share/proj

# Prepare directory
ADD . /webodm/
WORKDIR /webodm

# Use old-releases for 21.04
RUN printf "deb http://old-releases.ubuntu.com/ubuntu/ hirsute main restricted\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates main restricted\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute universe\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates universe\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute multiverse\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-updates multiverse\ndeb http://old-releases.ubuntu.com/ubuntu/ hirsute-backports main restricted universe multiverse" > /etc/apt/sources.list

# Install Node.js using new Node install method
RUN apt-get -qq update && apt-get -o Acquire::Retries=3 -qq install -y --no-install-recommends wget curl && \
    apt-get -o Acquire::Retries=3 install -y ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    NODE_MAJOR=20 && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get -o Acquire::Retries=3 -qq update && apt-get -o Acquire::Retries=3 -qq install -y nodejs && \
    # Install Python3, GDAL, PDAL, nginx, letsencrypt, psql
    apt-get -o Acquire::Retries=3 -qq update && apt-get -o Acquire::Retries=3 -qq install -y --no-install-recommends python3 python3-pip python3-setuptools python3-wheel git g++ python3-dev python2.7-dev libpq-dev binutils libproj-dev gdal-bin pdal libgdal-dev python3-gdal nginx certbot gettext-base cron postgresql-client-13 gettext tzdata && \
    update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && update-alternatives --install /usr/bin/python python /usr/bin/python3.9 2 && \
    # Install pip reqs
    pip install pip==24.0 && pip install -r requirements.txt "boto3==1.14.14" && \
    # Setup cron
    ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && chmod 0644 /webodm/nginx/crontab && service cron start && chmod +x /webodm/nginx/letsencrypt-autogen.sh && \
    /webodm/nodeodm/setup.sh && /webodm/nodeodm/cleanup.sh && cd /webodm && \
    npm install --quiet -g webpack@5.89.0 && npm install --quiet -g webpack-cli@5.1.4 && npm install --quiet && webpack --mode production && \
    echo "UTC" > /etc/timezone && \
    python manage.py collectstatic --noinput && \
    python manage.py rebuildplugins && \
    python manage.py translate build --safe && \
    # Cleanup
    apt-get remove -y g++ python3-dev libpq-dev && apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm /webodm/webodm/secret_key.py

VOLUME /webodm/app/media
