FROM ubuntu:20.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm
ENV PROJ_LIB=/usr/share/proj

# Prepare directory
RUN mkdir /webodm
WORKDIR /webodm

RUN apt-get -qq update && apt-get install -y software-properties-common tzdata
RUN add-apt-repository -y ppa:ubuntugis/ubuntugis-unstable

# Install Node.js
RUN apt-get -qq update && apt-get -qq install -y --no-install-recommends wget curl
RUN wget --no-check-certificate https://deb.nodesource.com/setup_12.x -O /tmp/node.sh && bash /tmp/node.sh
RUN apt-get -qq update && apt-get -qq install -y nodejs

# Install Python3, GDAL, nginx, letsencrypt, psql
RUN apt-get -qq update && apt-get -qq install -y --no-install-recommends python3 python3-pip python3-setuptools python3-wheel git g++ python3-dev python2.7-dev libpq-dev binutils libproj-dev gdal-bin python3-gdal nginx certbot grass-core gettext-base cron postgresql-client-12 gettext
RUN update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && update-alternatives --install /usr/bin/python python /usr/bin/python3.8 2
RUN ln -s /usr/bin/pip3 /usr/bin/pip && pip install -U pip

# Install pip reqs
ADD requirements.txt /webodm/
RUN pip install -r requirements.txt

ADD . /webodm/

# Setup cron
RUN ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && chmod 0644 /webodm/nginx/crontab && service cron start && chmod +x /webodm/nginx/letsencrypt-autogen.sh

#RUN git submodule update --init

WORKDIR /webodm/nodeodm/external/NodeODM
RUN npm install --quiet

WORKDIR /webodm
RUN npm install --quiet -g webpack@4.16.5 && npm install --quiet -g webpack-cli@4.2.0 && npm install --quiet && webpack --mode production
RUN echo "UTC" > /etc/timezone
RUN python manage.py collectstatic --noinput
RUN bash app/scripts/plugin_cleanup.sh && echo "from app.plugins import build_plugins;build_plugins()" | python manage.py shell
RUN bash translate.sh build safe

# Cleanup
RUN apt-get remove -y g++ python3-dev libpq-dev && apt-get autoremove -y
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* 

RUN rm /webodm/webodm/secret_key.py

VOLUME /webodm/app/media
