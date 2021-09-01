FROM ubuntu:20.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ENV POSTGRES_PASSWORD postgres

# Setup system
RUN apt-get update
RUN set -eux; \
	groupadd -r postgres --gid=999; \
	useradd -r -g postgres --uid=999 --home-dir=/var/lib/postgresql --shell=/bin/bash postgres; \
	mkdir -p /var/lib/postgresql; \
	chown -R postgres:postgres /var/lib/postgresql

# grab gosu for easy step-down from root
# https://github.com/tianon/gosu/releases
ENV GOSU_VERSION 1.12
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends wget; \
	rm -rf /var/lib/apt/lists/*; \
	dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
	wget --no-check-certificate -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch"; \
	chmod +x /usr/local/bin/gosu; \
	gosu --version; \
	gosu nobody true

# make the "en_US.UTF-8" locale so postgres will be utf-8 enabled by default
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends locales; \
	localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8
ENV LANG en_US.utf8

RUN mkdir /docker-entrypoint-initdb.d

ENV PG_MAJOR 9.5
ENV PG_VERSION 9.5.25
ENV POSTGIS_VERSION 2.3.0
ENV PATH $PATH:/usr/local/pgsql/bin
ENV DEBIAN_FRONTEND=noninteractive

# Build Postgres from source
RUN set -ex; \
	mkdir /staging; \
	apt-get update; \
	apt-get install -y --no-install-recommends wget gcc build-essential libproj-dev libgeos-dev libxml2-dev; \ 
	cd /staging; \
	wget --no-check-certificate -q https://github.com/OpenDroneMap/WebODM/releases/download/v1.9.2/postgresql-$PG_VERSION.tar.gz

RUN set -ex; \
	cd /staging; \
	tar -zxf postgresql-$PG_VERSION.tar.gz; \
	cd postgresql-$PG_VERSION; \
	./configure --without-readline --without-zlib; \
	make -j$(nproc); \
	make install; \
	postgres --version

RUN set -eux; \
	sed -ri "s!^#?(listen_addresses)\s*=\s*\S+.*!\1 = '*'!" /usr/local/pgsql/share/postgresql.conf.sample; \
	grep -F "listen_addresses = '*'" /usr/local/pgsql/share/postgresql.conf.sample

RUN mkdir -p /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql && chmod 2777 /var/run/postgresql

ENV PGDATA /var/lib/postgresql/data
# this 777 will be replaced by 700 at runtime (allows semi-arbitrary "--user" values)
RUN mkdir -p "$PGDATA" && chown -R postgres:postgres "$PGDATA" && chmod 777 "$PGDATA"
VOLUME /var/lib/postgresql/data

# Build PostGIS from source
RUN set -ex; \
	apt-get update; \
	apt-get install -y --no-install-recommends libgdal-dev libjson-c-dev; \
	cd /staging; \
	wget --no-check-certificate -q https://github.com/OpenDroneMap/WebODM/releases/download/v1.9.2/postgis-$POSTGIS_VERSION.tar.gz; \
	wget --no-check-certificate -q -O /usr/include/json-c/json_object_private.h https://raw.githubusercontent.com/json-c/json-c/json-c-0.13/json_object_private.h; \
	tar -zxf postgis-$POSTGIS_VERSION.tar.gz; \
	sed -i 's/#error.*/#define ACCEPT_USE_OF_DEPRECATED_PROJ_API_H 1/' /usr/include/proj_api.h

RUN set -ex; \
	cd /staging/postgis-$POSTGIS_VERSION; \
	./configure --with-pgconfig=/usr/local/pgsql/bin/pg_config; \
	make; \
	make install

RUN set -ex; \
	apt-get remove -y gcc build-essential wget; \
	apt-get clean; \
	rm -fr /var/lib/apt/lists/* /staging;

COPY docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh / # backwards compat
ENTRYPOINT ["docker-entrypoint.sh"]

STOPSIGNAL SIGINT

COPY init.sql /docker-entrypoint-initdb.d/init-db.sql
RUN chmod 644 /docker-entrypoint-initdb.d/init-db.sql

EXPOSE 5432
CMD ["postgres"]