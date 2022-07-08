WO_HOST=demo.webodm.org WO_PORT=443 WO_SSL_INSECURE_PORT_REDIRECT=80 WO_SSL=YES WO_DEBUG=NO docker-compose -f docker-compose.yml -f docker-compose.ssl.yml -f docker-compose.build.yml up -d
