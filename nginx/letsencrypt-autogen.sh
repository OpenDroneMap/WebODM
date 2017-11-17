#!/bin/bash
set -eo pipefail
__dirname=$(cd $(dirname "$0"); pwd -P)
cd ${__dirname}

hash certbot 2>/dev/null || not_found=true 
if [ $not_found ]; then
	echo "Certbot not found. You need to install certbot to use this script."
	exit 1
fi

if [ "$SSL" = "NO" ] || [ ! -z "$SSL_KEY" ]; then
	echo "SSL not enabled, or manual SSL key specified, exiting."
	exit 1
fi

DOMAIN="${HOST:=$1}"
if [ -z $DOMAIN ]; then
	echo "Usage: $0 <my.domain.com>"
	exit 1
fi

# Generate/update certificate
certbot certonly --work-dir ./letsencrypt --config-dir ./letsencrypt --logs-dir ./letsencrypt --standalone -d $DOMAIN --register-unsafely-without-email --agree-tos --keep

# Create ssl dir if necessary
if [ ! -e ssl/ ]; then
	mkdir ssl
fi

# Update symlinks
if [ -e ssl/key.pem ]; then
	rm ssl/key.pem
fi

if [ -e ssl/cert.pem ]; then
	rm ssl/cert.pem
fi

if [ -e "letsencrypt/live/$DOMAIN" ]; then
	ln -vs "letsencrypt/live/$DOMAIN/privkey.pem" ssl/key.pem
	ln -vs "letsencrypt/live/$DOMAIN/chain.pem" ssl/cert.pem
fi