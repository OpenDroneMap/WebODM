WO_HOST=demo.webodm.org WO_PORT=8444 WO_SSL_INSECURE_PORT_REDIRECT=8081 WO_SSL=YES WO_DEBUG=NO docker-compose -f docker-compose.yml -f docker-compose.ssl.yml -f docker-compose.build.yml up -d
