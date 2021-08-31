FROM postgres:9.5
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV POSTGRES_PASSWORD postgres

# Build PostGIS from source
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget gcc build-essential libproj-dev libgeos-dev libpq-dev libxml2-dev postgresql-server-dev-9.5 && \
    mkdir /staging && \
    cd /staging && \
    wget --no-check-certificate -q https://download.osgeo.org/postgis/source/postgis-2.3.0.tar.gz && \
    tar -zxvf postgis-2.3.0.tar.gz && \
    cd postgis-2.3.0 && \
    ./configure --without-raster && \
    make -j$(nproc) && \
    make install && \
    cd / && \
    rm -fr /staging && \
    apt-get remove -y gcc build-essential postgresql-server-dev-9.5 wget && \
    apt-get clean

EXPOSE 5432
COPY init.sql /docker-entrypoint-initdb.d/init-db.sql
RUN chmod 644 /docker-entrypoint-initdb.d/init-db.sql
