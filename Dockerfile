# Base image
FROM webodm_webapp_base:latest

# Build-time variables
ARG TEST_BUILD
ARG DEBIAN_FRONTEND=noninteractive

# Environment variables
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH $PYTHONPATH:/webodm
ENV PROJ_LIB=/usr/share/proj


# Prepare directory structure
ADD . /webodm/
WORKDIR /webodm


# Setup cron
RUN ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && \
    chmod 0644 /webodm/nginx/crontab && \
    service cron start && \
    chmod +x /webodm/nginx/letsencrypt-autogen.sh

# Setup NodeODM and install JavaScript dependencies
RUN /webodm/nodeodm/setup.sh && \
    /webodm/nodeodm/cleanup.sh && \
    cd /webodm && \
    npm install --quiet -g webpack@5.89.0 && \
    npm install --quiet -g webpack-cli@5.1.4 && \
    npm install --quiet && \
    webpack --mode production

# Configurações Django
RUN echo "UTC" > /etc/timezone && \
    python manage.py collectstatic --noinput && \
    python manage.py rebuildplugins && \
    python manage.py translate build --safe

# Cleanupe
RUN echo "Cleaning up unnecessary files" && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm -f /webodm/webodm/secret_key.py


# Volume for media files
VOLUME /webodm/app/media