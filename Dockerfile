FROM python:2.7
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm

# Prepare directory
RUN mkdir /webodm
WORKDIR /webodm

# Install pip reqs
ADD requirements.txt /webodm/
RUN pip install -r requirements.txt

# swagger_spec_validator is not up to date, fetch directly from github
RUN pip install --upgrade git+git://github.com/Yelp/swagger_spec_validator

# Add repository files
ADD . /webodm/

RUN git submodule init 
RUN git submodule update

# Install Node.js + npm requirements for testing node-OpenDroneMap
RUN curl --silent --location https://deb.nodesource.com/setup_6.x | sudo bash -
RUN apt-get install -y nodejs

WORKDIR /webodm/nodeodm/external/node-OpenDroneMap
RUN npm install

WORKDIR /webodm

# Make sure all scripts are executable
RUN chmod +x *.sh
