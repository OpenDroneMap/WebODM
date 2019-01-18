#!/bin/bash
set -eo pipefail
__dirname=$(cd $(dirname "$0"); pwd -P)
cd "${__dirname}"

platform="Linux" # Assumed
uname=$(uname)
case $uname in
	"Darwin")
	platform="MacOS / OSX"
	;;
	MINGW*)
	platform="Windows"
	;;
esac

if [[ $platform = "Windows" ]]; then
	export COMPOSE_CONVERT_WINDOWS_PATHS=1
fi

# Plugin commands require us to mount a docker volume
# but older version of Windows and certain macOS directory locations
# require user interaction. We will add better support for these in the near future.
plugins_volume=false
if [[ $platform = "Linux" ]]; then
    plugins_volume=true
elif [[ $platform = "MacOS / OSX" ]] && [[ $(pwd) == /Users* ]]; then
    plugins_volume=true
fi

load_default_node=true

# Load default values
source .env
DEFAULT_PORT="$WO_PORT"
DEFAULT_HOST="$WO_HOST"
DEFAULT_MEDIA_DIR="$WO_MEDIA_DIR"
DEFAULT_SSL="$WO_SSL"
DEFAULT_SSL_INSECURE_PORT_REDIRECT="$WO_SSL_INSECURE_PORT_REDIRECT"
DEFAULT_BROKER="$WO_BROKER"

# Parse args for overrides
POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --port)
    export WO_PORT="$2"
    shift # past argument
    shift # past value
    ;;    
    --hostname)
    export WO_HOST="$2"
    shift # past argument
    shift # past value
    ;;
	--media-dir)
    export WO_MEDIA_DIR=$(realpath "$2")
    shift # past argument
    shift # past value
    ;;
    --ssl)
    export WO_SSL=YES
    shift # past argument
    ;;
	--ssl-key)
    export WO_SSL_KEY=$(realpath "$2")
    shift # past argument
    shift # past value
    ;;
	--ssl-cert)
    export WO_SSL_CERT=$(realpath "$2")
    shift # past argument
    shift # past value
    ;;
	--ssl-insecure-port-redirect)
    export WO_SSL_INSECURE_PORT_REDIRECT="$2"
    shift # past argument
    shift # past value
    ;;
    --debug)
    export WO_DEBUG=YES
    shift # past argument
    ;;
	--broker)
    export WO_BROKER="$2"
    shift # past argument
    shift # past value
    ;;
    --mount-plugins-volume)
    plugins_volume=true
    shift # past argument
    ;;
    --no-default-node)
    load_default_node=false
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameter

usage(){
  echo "Usage: $0 <command>"
  echo
  echo "This program helps to manage the setup/teardown of the docker containers for running WebODM. We recommend that you read the full documentation of docker at https://docs.docker.com if you want to customize your setup."
  echo 
  echo "Command list:"
  echo "	start [options]		Start WebODM"
  echo "	stop			Stop WebODM"
  echo "	down			Stop and remove WebODM's docker containers"
  echo "	update			Update WebODM to the latest release"
  echo "	rebuild			Rebuild all docker containers and perform cleanups"
  echo "	checkenv		Do an environment check and install missing components"
  echo "	test			Run the unit test suite (developers only)"
  echo "	resetadminpassword <new password>	Reset the administrator's password to a new one. WebODM must be running when executing this command."
  if [[ $plugins_volume = true ]]; then
    echo ""
    echo "	plugin enable <plugin name>	Enable a plugin"
    echo "	plugin disable <plugin name>	Disable a plugin"
    echo "	plugin list		List all available plugins"
    echo "	plugin cleanup		Cleanup plugins build directories"
  fi
  echo ""
  echo "Options:"
  echo "	--port	<port>	Set the port that WebODM should bind to (default: $DEFAULT_PORT)"
  echo "	--hostname	<hostname>	Set the hostname that WebODM will be accessible from (default: $DEFAULT_HOST)"
  echo "	--media-dir	<path>	Path where processing results will be stored to (default: $DEFAULT_MEDIA_DIR (docker named volume))"
  echo "	--no-default-node	Do not create a default NodeODM node attached to WebODM on startup (default: disabled)"
  echo "	--ssl	Enable SSL and automatically request and install a certificate from letsencrypt.org. (default: $DEFAULT_SSL)"
  echo "	--ssl-key	<path>	Manually specify a path to the private key file (.pem) to use with nginx to enable SSL (default: None)"
  echo "	--ssl-cert	<path>	Manually specify a path to the certificate file (.pem) to use with nginx to enable SSL (default: None)"
  echo "	--ssl-insecure-port-redirect	<port>	Insecure port number to redirect from when SSL is enabled (default: $DEFAULT_SSL_INSECURE_PORT_REDIRECT)"
  echo "	--debug	Enable debug for development environments (default: disabled)"
  echo "	--broker	Set the URL used to connect to the celery broker (default: $DEFAULT_BROKER)"
  if [[ $plugins_volume = false ]]; then
    echo "	--mount-plugins-volume	Always mount the ./plugins volume, even on unsupported platforms (developers only) (default: disabled)"
  fi
  exit
}

# $1 = command | $2 = help_text | $3 = install_command (optional)
check_command(){
	check_msg_prefix="Checking for $1... "
	check_msg_result="\033[92m\033[1m OK\033[0m\033[39m"

	hash $1 2>/dev/null || not_found=true 
	if [[ $not_found ]]; then
		
		# Can we attempt to install it?
		if [[ ! -z "$3" ]]; then
			echo -e "$check_msg_prefix \033[93mnot found, we'll attempt to install\033[39m"
			run "$3 || sudo $3"

			# Recurse, but don't pass the install command
			check_command "$1" "$2"	
		else
			check_msg_result="\033[91m can't find $1! Check that the program is installed and that you have added the proper path to the program to your PATH environment variable before launching WebODM. If you change your PATH environment variable, remember to close and reopen your terminal. $2\033[39m"
		fi
	fi

	echo -e "$check_msg_prefix $check_msg_result"
	if [[ $not_found ]]; then
		return 1
	fi
}

environment_check(){
	check_command "docker" "https://www.docker.com/"
	check_command "git" "https://git-scm.com/downloads"
	check_command "python" "https://www.python.org/downloads/"
	check_command "pip" "Run \033[1msudo easy_install pip\033[0m" "easy_install pip"
	check_command "docker-compose" "Run \033[1mpip install docker-compose\033[0m" "pip install docker-compose"
}

run(){
	echo $1
	eval $1
}

start(){
	echo "Starting WebODM..."
	echo ""
	echo "Using the following environment:"
	echo "================================"
	echo "Host: $WO_HOST"
	echo "Port: $WO_PORT"
	echo "Media directory: $WO_MEDIA_DIR"
	echo "SSL: $WO_SSL"
	echo "SSL key: $WO_SSL_KEY"
	echo "SSL certificate: $WO_SSL_CERT"
	echo "SSL insecure port redirect: $WO_SSL_INSECURE_PORT_REDIRECT"
	echo "Celery Broker: $WO_BROKER"
	echo "================================"
	echo "Make sure to issue a $0 down if you decide to change the environment."
	echo ""

	command="docker-compose -f docker-compose.yml"

    if [[ $load_default_node = true ]]; then
        command+=" -f docker-compose.nodeodm.yml"
    fi
	
	if [ "$WO_SSL" = "YES" ]; then
		if [ ! -z "$WO_SSL_KEY" ] && [ ! -e "$WO_SSL_KEY" ]; then
			echo -e "\033[91mSSL key file does not exist: $WO_SSL_KEY\033[39m"
			exit 1
		fi
		if [ ! -z "$WO_SSL_CERT" ] && [ ! -e "$WO_SSL_CERT" ]; then
			echo -e "\033[91mSSL certificate file does not exist: $WO_SSL_CERT\033[39m"
			exit 1
		fi
		
		command+=" -f docker-compose.ssl.yml"
		
		method="Lets Encrypt"
		if [ ! -z "$WO_SSL_KEY" ] && [ ! -z "$WO_SSL_CERT" ]; then
			method="Manual"
			command+=" -f docker-compose.ssl-manual.yml"
		fi

		if [ "$method" = "Lets Encrypt" ]; then
			# Check port settings
			# as let's encrypt cannot communicate on ports
			# different than 80 or 443
			if [ "$WO_PORT" != "$DEFAULT_PORT" ]; then
				echo -e "\033[93mLets Encrypt cannot run on port: $WO_PORT, switching to 443.\033[39m"
				echo "If you need to use a different port, you'll need to generate the SSL certificate files separately and use the --ssl-key and --ssl-certificate options."
			fi
			export WO_PORT=443
		fi
		
		# Make sure we have a hostname
		if [ "$WO_HOST" = "localhost" ]; then
			echo -e "\033[91mSSL is enabled, but hostname cannot be set to $WO_HOST. Set the --hostname argument to the domain of your WebODM server (for example: www.mywebodm.org).\033[39m"
			exit 1
		fi

		echo "Will enable SSL ($method)"
	fi

    if [[ $plugins_volume = true ]]; then
        command+=" -f docker-compose.plugins.yml"
    fi

	run "$command start || $command up"
}

down(){
	run "docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml down --remove-orphans"
}

rebuild(){
	run "docker-compose down --remove-orphans"
	plugin_cleanup
	run "rm -fr node_modules/ || sudo rm -fr node_modules/"
	run "rm -fr nodeodm/external/NodeODM || sudo rm -fr nodeodm/external/NodeODM"
	run "docker-compose -f docker-compose.yml -f docker-compose.build.yml build --no-cache"
	#run "docker images --no-trunc -aqf \"dangling=true\" | xargs docker rmi"
	echo -e "\033[1mDone!\033[0m You can now start WebODM by running $0 start"
}

plugin_cleanup(){
    # Delete all node_modules and build directories within plugins' public/ folders
    find plugins/ -type d \( -name build -o -name node_modules \) -path 'plugins/*/public/*' -exec rm -frv '{}' \;
}

plugin_list(){
    plugins=$(ls plugins/ --hide test)
    for plugin in $plugins; do
        if [ -e "plugins/$plugin/disabled" ]; then
            echo "$plugin [disabled]"
        else
            echo "$plugin"
        fi
    done
}

plugin_check(){
    plugin_name="$1"
    if [ ! -e "plugins/$plugin_name" ]; then
        echo "Plugin $plugin_name does not exist."
        exit 1
    fi
}

plugin_volume_check(){
    if [[ $plugins_volume = false ]]; then
        path=$(realpath ./plugins)
        echo "================"
        echo "WARNING: Your platform does not support automatic volume mounting. If you want to enable/disable/develop plugins you need to:"
        echo "1. Make sure docker can mount [$path] by modifying the docker File Sharing options"
        echo "2. Pass the --mount-plugins-volume option to ./webodm.sh commands"
        echo "================"
        echo
    fi
}

plugin_enable(){
    plugin_name="$1"
    plugin_check $plugin_name
    plugin_volume_check

    if [ -e "plugins/$plugin_name/disabled" ]; then
        rm "plugins/$plugin_name/disabled"
        echo "Plugin enabled. Run ./webodm.sh restart to apply the changes."
    else
        echo "Plugin already enabled."
    fi
}

plugin_disable(){
    plugin_name="$1"
    plugin_check $plugin_name
    plugin_volume_check
    
    if [ ! -e "plugins/$plugin_name/disabled" ]; then
        touch "plugins/$plugin_name/disabled"
        echo "Plugin disabled. Run ./webodm.sh restart to apply the changes."
    else
        echo "Plugin already disabled."
    fi
}

run_tests(){
	echo -e "\033[1mRunning frontend tests\033[0m"
	run "npm run test"

	echo "\033[1mRunning backend tests\033[0m"
	run "python manage.py test"

	echo ""
	echo -e "\033[1mDone!\033[0m Everything looks in order."
}

resetpassword(){
	newpass=$1

	if [[ ! -z "$newpass" ]]; then
		container_hash=$(docker ps -q --filter "name=webapp")
		if [[ -z "$container_hash" ]]; then
			echo -e "\033[91mCannot find webapp docker container. Is WebODM running?\033[39m"
			exit 1
		fi

		docker exec $container_hash bash -c "echo \"from django.contrib.auth.models import User;from django.contrib.auth.hashers import make_password;u=User.objects.filter(is_superuser=True)[0];u.password=make_password('$newpass');u.save();print('The following user was changed: {}'.format(u.username));\" | python manage.py shell"
		if [[ "$?" -eq 0 ]]; then
			echo -e "\033[1mPassword changed!\033[0m"
		else
			echo -e "\033[91mCould not change administrator password. If you need help, please visit https://github.com/OpenDroneMap/WebODM/issues/ \033[39m"
		fi
	else
		usage
	fi
}

if [[ $1 = "start" ]]; then
	environment_check
	start
elif [[ $1 = "stop" ]]; then
	environment_check
	echo "Stopping WebODM..."
	run "docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml stop"
elif [[ $1 = "restart" ]]; then
	environment_check
	echo "Restarting WebODM..."
	down
	start
elif [[ $1 = "down" ]]; then
	environment_check
	echo "Tearing down WebODM..."
	down
elif [[ $1 = "rebuild" ]]; then
	environment_check
	echo  "Rebuilding WebODM..."
	rebuild
elif [[ $1 = "update" ]]; then
	echo "Updating WebODM..."
	run "git pull origin master"
	run "docker pull opendronemap/nodeodm"
	run "docker pull opendronemap/webodm_db"
	run "docker pull opendronemap/webodm_webapp"
	down
	echo -e "\033[1mDone!\033[0m You can now start WebODM by running $0 start"
elif [[ $1 = "checkenv" ]]; then
	environment_check
elif [[ $1 = "test" ]]; then
	run_tests
elif [[ $1 = "resetadminpassword" ]]; then
	resetpassword $2
elif [[ $1 = "plugin" ]]; then
    if [[ $2 = "cleanup" ]]; then
        plugin_cleanup
    elif [[ $2 = "list" ]]; then
        plugin_list
    elif [[ $2 = "enable" ]]; then
        if [[ ! -z "$3" ]]; then
            plugin_enable $3
        else
            usage
        fi
    elif [[ $2 = "disable" ]]; then
        if [[ ! -z "$3" ]]; then
            plugin_disable $3
        else
            usage
        fi
    else
        usage
    fi
else
	usage
fi
