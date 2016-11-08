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

RUN git submodule init 
RUN git submodule update

# Install Node.js + other packages
RUN curl --silent --location https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs binutils libproj-dev gdal-bin

WORKDIR /webodm/nodeodm/external/node-OpenDroneMap
RUN npm install

WORKDIR /webodm
RUN npm install -g webpack
RUN npm install
