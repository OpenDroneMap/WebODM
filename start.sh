#!/bin/bash

echo -e "\e[92m"      
echo " _       __     __    ____  ____  __  ___"
echo "| |     / /__  / /_  / __ \/ __ \/  |/  /"
echo "| | /| / / _ \/ __ \/ / / / / / / /|_/ / "
echo "| |/ |/ /  __/ /_/ / /_/ / /_/ / /  / /  "
echo "|__/|__/\___/_.___/\____/_____/_/  /_/   "
echo                          
echo -e "\e[39m"

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
    echo -e "\e[33mYour system is currently using Python 2.x. You need to install or configure your system to use Python 3.x. Check out http://docs.python-guide.org/en/latest/dev/virtualenvs/ for information on how to setup Python 3.x alongside your Python 2.x install.\e[39m"
    echo
    exit
fi

# Check GDAL version
python -c "import sys;import re;import subprocess;version = subprocess.Popen([\"gdalinfo\", \"--version\"], stdout=subprocess.PIPE).communicate()[0].decode().rstrip();ret = 0 if re.compile('^GDAL [2-9]\.[1-9]+').match(version) else 1; print('Checking GDAL version... ' + ('{}, excellent!'.format(version) if ret == 0 else version));sys.exit(ret);"
if [ $? -ne 0 ]; then
	almost_there
    echo -e "\e[33mYour system is currently using a version of GDAL that is too old, or GDAL is not installed. You need to install or configure your system to use GDAL 2.1 or higher. If you have installed multiple versions of GDAL, make sure the newer one takes priority in your PATH environment variable.\e[39m"
    echo
    exit
fi

echo Building asssets...
webpack

echo Running migrations
python manage.py migrate

if [[ $1 = "--create-default-pnode" ]]; then
   echo "from nodeodm.models import ProcessingNode; ProcessingNode.objects.update_or_create(hostname='node-odm-1', defaults={'hostname': 'node-odm-1', 'port': 3000})" | python manage.py shell
fi

python manage.py runserver 0.0.0.0:8000
