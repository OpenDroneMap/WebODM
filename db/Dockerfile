FROM postgres:9.5
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV POSTGIS_MAJOR 2.3

RUN echo "deb http://deb.debian.org/debian jessie-backports main" >> /etc/apt/sources.list \
	  && apt-get update \
      && apt-get install -t jessie-backports -y --no-install-recommends libsfcgal1 \
      && apt-get install -y --no-install-recommends \
           postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR \
           postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR-scripts \
           postgis \
      && rm -rf /var/lib/apt/lists/*

EXPOSE 5432
COPY init.sql /docker-entrypoint-initdb.d/init-db.sql
RUN chmod 644 /docker-entrypoint-initdb.d/init-db.sql
