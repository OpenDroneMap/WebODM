FROM postgres:9.5
MAINTAINER Piero Toffanin <pt@masseranolabs.com>
EXPOSE 5432
COPY init.sql /docker-entrypoint-initdb.d/init-db.sql
