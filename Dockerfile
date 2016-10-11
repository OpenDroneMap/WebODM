FROM python:2.7
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm

# Prepare directory
RUN mkdir /webodm
WORKDIR /webodm

# Install pip reqs
ADD requirements.txt /webodm/
RUN pip install --upgrade git+https://github.com/pierotofy/django-knockout
RUN pip install -r requirements.txt

# swagger_spec_validator is not up to date, fetch directly from github
# also install django-knockout
RUN pip install --upgrade git+https://github.com/Yelp/swagger_spec_validator

ADD . /webodm/

RUN git submodule init 
RUN git submodule update

# Install Node.js + npm requirements for testing node-OpenDroneMap and React
RUN curl --silent --location https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

WORKDIR /webodm/nodeodm/external/node-OpenDroneMap
RUN npm install

WORKDIR /webodm
RUN npm install -g webpack
RUN npm install
