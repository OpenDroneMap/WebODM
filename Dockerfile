FROM python:3.5
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm

# Prepare directory
RUN mkdir /webodm
WORKDIR /webodm

# Install pip reqs
ADD requirements.txt /webodm/
RUN pip install -r requirements.txt

ADD . /webodm/

RUN git submodule update --init

# Install Node.js
RUN curl --silent --location https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

# Configure use of testing branch of Debian
RUN printf "Package: *\nPin: release a=stable\nPin-Priority: 900\n" > /etc/apt/preferences.d/stable.pref
RUN printf "Package: *\nPin: release a=testing\nPin-Priority: 750\n" > /etc/apt/preferences.d/testing.pref
RUN printf "deb     http://mirror.steadfast.net/debian/    stable main contrib non-free\ndeb-src http://mirror.steadfast.net/debian/    stable main contrib non-free" > /etc/apt/sources.list.d/stable.list
RUN printf "deb     http://mirror.steadfast.net/debian/    testing main contrib non-free\ndeb-src http://mirror.steadfast.net/debian/    testing main contrib non-free" > /etc/apt/sources.list.d/testing.list

# Install GDAL
RUN apt-get update && apt-get install -t testing -y binutils libproj-dev gdal-bin

WORKDIR /webodm/nodeodm/external/node-OpenDroneMap
RUN npm install

WORKDIR /webodm
RUN npm install -g webpack
RUN npm install

VOLUME /webodm/app/media
