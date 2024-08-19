FROM ubuntu:20.04
MAINTAINER Piero Toffanin <pt@masseranolabs.com>

ARG TEST_BUILD
ARG DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=$PYTHONPATH:/webodm
ENV NODE_MAJOR=20
ENV PYTHON_MAJOR=3.9
ENV GDAL_VERSION=3.8.5
ENV LD_LIBRARY_PATH=/usr/local/lib

# # Prepare directory
ADD . /webodm/
WORKDIR /webodm

RUN apt-get -o Acquire::Retries=3 -qq update > /dev/null && \
    apt-get -o Acquire::Retries=3 -qq install -y --no-install-recommends wget curl git g++ clang make cmake postgresql-client > /dev/null && \

    # Install PDAL, letsencrypt, psql, cron
    apt-get -o Acquire::Retries=3 -qq install -y --no-install-recommends binutils pdal certbot gettext tzdata libproj-dev libpq-dev > /dev/null && \
    
    # Install Python in target version
    apt-get -qq autoremove -y python3 && \
    apt-get -o Acquire::Retries=3 -qq install -y --no-install-recommends python$PYTHON_MAJOR-dev python$PYTHON_MAJOR-full && \
    ln -s /usr/bin/python$PYTHON_MAJOR /usr/bin/python && \
    curl https://bootstrap.pypa.io/get-pip.py | python && \
 
    echo $(pip -V) && \
    echo $(python -V) && \ 

    # Build GDAL from source
    wget --no-check-certificate -q https://github.com/OSGeo/gdal/releases/download/v$GDAL_VERSION/gdal-$GDAL_VERSION.tar.gz && \
    tar -xzf gdal-$GDAL_VERSION.tar.gz && \
    cd gdal-$GDAL_VERSION && mkdir build && cd build && \
    cmake .. && cmake --build . -j$(nproc) --target install && \
    cd / && rm -rf gdal-$GDAL_VERSION gdal-$GDAL_VERSION.tar.gz && \

    # Install pip reqs
    cd /webodm && \
    pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --quiet -U pip && \
    pip install --quiet -r requirements.txt "boto3==1.34.145" && \
    
    # Install Node.js using new Node install method
    apt-get -o Acquire::Retries=3 -qq install -y ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get -o Acquire::Retries=3 -qq update && apt-get -o Acquire::Retries=3 -qq install -y nodejs && \
    # Setup cron
    apt-get -o Acquire::Retries=3 -qq install -y --no-install-recommends nginx cron && \
    ln -s /webodm/nginx/crontab /var/spool/cron/crontabs/root && chmod 0644 /webodm/nginx/crontab && service cron start && chmod +x /webodm/nginx/letsencrypt-autogen.sh && \
    /webodm/nodeodm/setup.sh && /webodm/nodeodm/cleanup.sh && cd /webodm && \
    npm install --quiet -g webpack@5.89.0 && npm install --quiet -g webpack-cli@5.1.4 && npm install --quiet && webpack --mode production && \
    echo "UTC" > /etc/timezone && \
    python manage.py collectstatic --noinput && \
    python manage.py rebuildplugins && \
    python manage.py translate build --safe && \
    # Cleanup
    apt-get remove -y g++ python2 && apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm /webodm/webodm/secret_key.py

VOLUME /webodm/app/media
