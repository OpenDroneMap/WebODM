#!/bin/bash
__dirname=$(cd $(dirname "$0"); pwd -P)
cd ${__dirname}

hash certbot 2>/dev/null || not_found=true 
if [ $not_found ]; then
	echo "Certbot not found. You need to install certbot to use this script."
	exit 1
fi

if [ "$WO_SSL" = "NO" ] || [ ! -z "$WO_SSL_KEY" ]; then
	echo "SSL not enabled, or manual SSL key specified, exiting."
	exit 1
fi

DOMAIN="${WO_HOST:=$1}"
if [ -z $DOMAIN ]; then
	echo "Usage: $0 <my.domain.com>"
	exit 1
fi

# Stop nginx if needed (free the port used by the standalone server)
nginx_was_running="NO"
pgrep nginx > /dev/null
if [ $? -eq 0 ]; then
	killall nginx
	nginx_was_running="YES"
fi

# Generate/update certificate
certbot certonly --http-01-port 8080 --work-dir ./letsencrypt --config-dir ./letsencrypt --logs-dir ./letsencrypt --standalone -d $DOMAIN --register-unsafely-without-email --agree-tos --keep

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
	ln -vs "../letsencrypt/live/$DOMAIN/privkey.pem" ssl/key.pem
	ln -vs "../letsencrypt/live/$DOMAIN/fullchain.pem" ssl/cert.pem
else
	echo -e "\033[91mWARN: We couldn't automatically generate the SSL certificate. Review the console log. WebODM will likely be inaccessible.\033[39m"
fi

# Restart nginx if necessary
if [ "$nginx_was_running" = "YES" ]; then
	echo "Restarting nginx..."
	nginx -c $(pwd)/nginx-ssl.conf
fi
