#!/bin/bash
__dirname=$(cd $(dirname "$0"); pwd -P)
cd ${__dirname}

echo -e "\033[92m"      
echo " _       __     __    ____  ____  __  ___"
echo "| |     / /__  / /_  / __ \/ __ \/  |/  /"
echo "| | /| / / _ \/ __ \/ / / / / / / /|_/ / "
echo "| |/ |/ /  __/ /_/ / /_/ / /_/ / /  / /  "
echo "|__/|__/\___/_.___/\____/_____/_/  /_/   "
echo                          
echo -e "\033[39m"

almost_there(){
    echo 
    echo "===================="
    echo "You're almost there!"
    echo "===================="
}

# Check python version
python -c "import sys;ret = 1 if sys.version_info <= (3, 0) else 0;print('Checking python version... ' + ('3.x, good!' if ret == 0 else '2.x'));sys.exit(ret);"
if [ $? -ne 0 ]; then
	almost_there
    echo -e "\033[33mYour system is currently using Python 2.x. You need to install or configure your system to use Python 3.x. Check out http://docs.python-guide.org/en/latest/dev/virtualenvs/ for information on how to setup Python 3.x alongside your Python 2.x install.\033[39m"
    echo
    exit
fi

# Check GDAL version
python -c "import sys;import re;import subprocess;version = subprocess.Popen([\"gdalinfo\", \"--version\"], stdout=subprocess.PIPE).communicate()[0].decode().rstrip();ret = 0 if re.compile('^GDAL [2-9]\.[0-9]+').match(version) else 1; print('Checking GDAL version... ' + ('{}, excellent!'.format(version) if ret == 0 else version));sys.exit(ret);"
if [ $? -ne 0 ]; then
	almost_there
    echo -e "\033[33mYour system is currently using a version of GDAL that is too old, or GDAL is not installed. You need to install or configure your system to use GDAL 2.1 or higher. If you have installed multiple versions of GDAL, make sure the newer one takes priority in your PATH environment variable.\033[39m"
    echo
    exit
fi

if [ "$1" = "--setup-devenv" ] || [ "$2" = "--setup-devenv" ]; then
    echo Setup git modules...
    
    git submodule update --init
    
    echo Setup npm dependencies...
    npm install
    cd nodeodm/external/NodeODM
    npm install
    cd /webodm

    echo Setup pip requirements...
    pip install -r requirements.txt

    echo Setup webpack watch...
    webpack --watch &
fi

echo Running migrations
python manage.py migrate

if [[ "$WO_DEFAULT_NODES" > 0 ]]; then
   echo -e "from nodeodm.models import ProcessingNode\nfor node_index in map(str, range(1, $WO_DEFAULT_NODES + 1)):\n\t ProcessingNode.objects.update_or_create(hostname='webodm_node-odm_' + node_index, defaults={'hostname': 'webodm_node-odm_' + node_index, 'port': 3000, 'label': 'node-odm-' + node_index})" | python manage.py shell
fi

if [[ "$WO_CREATE_MICMAC_PNODE" = "YES" ]]; then
   echo "from nodeodm.models import ProcessingNode; ProcessingNode.objects.update_or_create(hostname='node-micmac-1', defaults={'hostname': 'node-micmac-1', 'port': 3000})" | python manage.py shell
fi

export WO_HOST="${WO_HOST:=localhost}"
export WO_PORT="${WO_PORT:=8000}"

# Dump environment to .cronenv
printenv > .cronenv

proto="http"
if [ "$WO_SSL" = "YES" ]; then
    proto="https"
fi

cat app/scripts/unlock_all_tasks.py | python manage.py shell
./worker.sh scheduler start

congrats(){
    (sleep 5; echo

    echo "Trying to establish communication..."
    status=$(curl --max-time 300 -L -s -o /dev/null -w "%{http_code}" "$proto://localhost:8000")

    if [[ "$status" = "200" ]]; then
        echo -e "\033[92m"      
        echo "Congratulations! └@(･◡･)@┐"
        echo ==========================
        echo -e "\033[39m"
        echo "If there are no errors, WebODM should be up and running!"
    else    
        echo -e "\033[93m"
        echo "Something doesn't look right! ¯\_(ツ)_/¯"
        echo "The server returned a status code of $status when we tried to reach it."
        echo ==========================
        echo -e "\033[39m"
        echo "Check if WebODM is running, maybe we tried to reach it too soon."
    fi

    echo -e "\033[93m"
    echo Open a web browser and navigate to $proto://$WO_HOST:$WO_PORT
    echo -e "\033[39m"
    echo -e "\033[91mNOTE:\033[39m Windows users using docker should replace localhost with the IP of their docker machine's IP. To find what that is, run: docker-machine ip") &
}

if [ "$1" = "--setup-devenv" ] || [ "$2" = "--setup-devenv" ] || [ "$1" = "--no-gunicorn" ]; then
    congrats
    python manage.py runserver 0.0.0.0:8000
else
    if [ -e /webodm ] && [ ! -e /webodm/build/static ]; then
       echo -e "\033[91mWARN:\033[39m /webodm/build/static does not exist, CSS, JS and other files might not be available."
    fi

    echo "Generating nginx configurations from templates..."
    for templ in nginx/*.template
    do
        echo "- ${templ%.*}"
        envsubst '\$WO_PORT \$WO_HOST' < $templ > ${templ%.*}
    done

    # Check if we need to auto-generate SSL certs via letsencrypt
    if [ "$WO_SSL" = "YES" ] && [ -z "$WO_SSL_KEY" ]; then
        echo "Launching letsencrypt-autogen.sh"
        ./nginx/letsencrypt-autogen.sh
    fi

    # Check if SSL key/certs are available
    conf="nginx.conf"
    if [ -e nginx/ssl ]; then
        echo "Using nginx SSL configuration"
        conf="nginx-ssl.conf"
    fi

    congrats

    nginx -c $(pwd)/nginx/$conf
    gunicorn webodm.wsgi --bind unix:/tmp/gunicorn.sock --timeout 300000 --max-requests 250 --preload
fi

# If this is executed, it means the previous command failed, don't display the congratulations message
kill %1
