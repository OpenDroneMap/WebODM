FROM ubuntu:16.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

WO_BROKER=redis://broker

RUN apt-get update && \
	apt-get install -y software-properties-common && \
	add-apt-repository -y ppa:ubuntugis/ubuntugis-unstable && \
	apt-get install update && \
	apt-get install -y grass-core python-pip

COPY requirements.txt /worker/
COPY ../wait-for-it.sh /worker/
WORKDIR /worker

RUN pip install -U pip && pip install -r requirements.txt

RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN chmod 644 /docker-entrypoint-initdb.d/init-db.sql
