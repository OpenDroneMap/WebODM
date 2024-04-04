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

# Update alternatives for Python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python2.7 1 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.9 2

# Install Python requirements with retry logic
RUN for i in {1..5}; do echo "Installing Python dependencies ($i attempt)" && \
    pip install -U pip && \
    pip install -r requirements.txt "boto3==1.14.14" && break || sleep 15; done


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


# Cleanup to reduce image size
RUN echo "Cleaning up unnecessary files" && \
    apt-get remove -y g++ python3-dev libpq-dev && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm -f /webodm/webodm/secret_key.py

# Volume for media files
VOLUME /webodm/app/media