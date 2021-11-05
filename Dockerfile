FROM ubuntu:21.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ARG TEST_BUILD
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm
ENV PROJ_LIB=/usr/share/proj

# Prepare directory
ADD . /webodm/
WORKDIR /webodm

# Install Node.js
RUN apt-get -qq update && apt-get -qq install -y --no-install-recommends wget curl && \
    wget --no-check-certificate https://deb.nodesource.com/setup_12.x -O /tmp/node.sh && bash /tmp/node.sh && \
    apt-get -qq update && apt-get -qq install -y nodejs && \
    # Install Python3, GDAL, PDAL, nginx, letsencrypt, psql
    apt-get -qq update && apt-get -qq install -y --no-install-recommends python3 python3-pip python3-setuptools python3-wheel git g++ python3-dev python2.7-dev libpq-dev binutils libproj-dev gdal-bin pdal libgdal-dev python3-gdal nginx certbot grass-core gettext-base cron postgresql-client-13 gettext tzdata && \
    update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && update-alternatives --install /usr/bin/python python /usr/bin/python3.9 2 && \
    # Install pip reqs
    pip install -U pip && pip install -r requirements.txt "boto3==1.14.14" && \
    # Setup cron
    ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && chmod 0644 /webodm/nginx/crontab && service cron start && chmod +x /webodm/nginx/letsencrypt-autogen.sh && \
    /webodm/nodeodm/setup.sh && /webodm/nodeodm/cleanup.sh && cd /webodm && \
    npm install --quiet -g webpack@4.16.5 && npm install --quiet -g webpack-cli@4.2.0 && npm install --quiet && webpack --mode production && \
    echo "UTC" > /etc/timezone && \
    python manage.py collectstatic --noinput && \
    python manage.py rebuildplugins && \
    python manage.py translate build --safe && \
    # Cleanup
    apt-get remove -y g++ python3-dev libpq-dev && apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm /webodm/webodm/secret_key.py

VOLUME /webodm/app/media
