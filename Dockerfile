FROM python:3.6-stretch
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm
ENV PROJ_LIB=/usr/share/proj

# Prepare directory
RUN mkdir /webodm
WORKDIR /webodm

RUN curl --silent --location https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get -qq install -y nodejs

# Configure use of testing branch of Debian
RUN printf "Package: *\nPin: release a=stable\nPin-Priority: 900\n" > /etc/apt/preferences.d/stable.pref
RUN printf "Package: *\nPin: release a=testing\nPin-Priority: 750\n" > /etc/apt/preferences.d/testing.pref
RUN printf "deb     http://ftp.us.debian.org/debian/    stable main contrib non-free\ndeb-src http://ftp.us.debian.org/debian/    stable main contrib non-free" > /etc/apt/sources.list.d/stable.list
RUN printf "deb     http://ftp.us.debian.org/debian/    testing main contrib non-free\ndeb-src http://ftp.us.debian.org/debian/    testing main contrib non-free" > /etc/apt/sources.list.d/testing.list

# Install Node.js GDAL, nginx, letsencrypt, psql
RUN apt-get -qq update && apt-get -qq install -t testing -y binutils libproj-dev gdal-bin nginx certbot grass-core && apt-get -qq install -y gettext-base cron postgresql-client-9.6

# Install pip reqs
ADD requirements.txt /webodm/
RUN pip install -r requirements.txt

ADD . /webodm/

# Setup cron
RUN ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && chmod 0644 /webodm/nginx/crontab && service cron start && chmod +x /webodm/nginx/letsencrypt-autogen.sh

RUN git submodule update --init

WORKDIR /webodm/nodeodm/external/NodeODM
RUN npm install --quiet

WORKDIR /webodm
RUN npm install --quiet -g webpack && npm install --quiet -g webpack-cli && npm install --quiet && webpack --mode production
RUN python manage.py collectstatic --noinput
RUN bash app/scripts/plugin_cleanup.sh && echo "from app.plugins import build_plugins;build_plugins()" | python manage.py shell

RUN rm /webodm/webodm/secret_key.py

VOLUME /webodm/app/media
