#!/bin/bash
set -eo pipefail

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

usage(){
  echo "Usage: $0 <command> [options]"
  echo
  echo "This program helps to manage the setup/teardown of the docker containers for running WebODM. We recommend that you read the full documentation of docker at https://docs.docker.com if you want to customize your setup."
  echo 
  echo "Command list:"
  echo "	start		Start WebODM"
  echo "	stop		Stop WebODM"
  echo "	down		Stop and remove WebODM's docker containers"
  echo "	update		Update WebODM to the latest release"
  echo "	rebuild		Rebuild all docker containers and perform cleanups"
  echo "	checkenv	Do an environment check and install missing components"
  echo "	resetadminpassword <newpassword>	Reset the administrator's password to a new one. WebODM must be running when executing this command."
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
	command="docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml"
	run "$command start || $command up"
}

rebuild(){
	run "docker-compose down --remove-orphans"
	run "rm -fr node_modules/ || sudo rm -fr node_modules/"
	run "rm -fr nodeodm/external/node-OpenDroneMap || sudo rm -fr nodeodm/external/node-OpenDroneMap"
	run "docker-compose -f docker-compose.yml -f docker-compose.build.yml build --no-cache"
	#run "docker images --no-trunc -aqf \"dangling=true\" | xargs docker rmi"
	echo -e "\033[1mDone!\033[0m You can now start WebODM by running $0 start"
}

resetpassword(){
	newpass=$1

	if [[ ! -z "$newpass" ]]; then
		container_hash=$(docker ps -q --filter "name=webapp")
		if [[ -z "$container_hash" ]]; then
			echo -e "\033[91mCannot find webapp docker container. Is WebODM running?\033[39m"
			exit 1
		fi

		docker exec -ti $container_hash bash -c "echo \"from django.contrib.auth.models import User;from django.contrib.auth.hashers import make_password;u=User.objects.filter(is_superuser=True)[0];u.password=make_password('$newpass');u.save();print('The following user was changed: {}'.format(u.username));\" | python manage.py shell"
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
	echo "Starting WebODM..."
	start
elif [[ $1 = "stop" ]]; then
	environment_check
	echo "Stopping WebODM..."
	run "docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml stop"
elif [[ $1 = "down" ]]; then
	environment_check
	echo "Tearing down WebODM..."
	run "docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml down"
elif [[ $1 = "rebuild" ]]; then
	environment_check
	echo  "Rebuilding WebODM..."
	rebuild
elif [[ $1 = "update" ]]; then
	echo "Updating WebODM..."
	run "git pull origin master"
	run "docker pull opendronemap/node-opendronemap"
	run "docker pull opendronemap/webodm_db"
	run "docker pull opendronemap/webodm_webapp"
	run "docker-compose down --remove-orphans"
	echo -e "\033[1mDone!\033[0m You can now start WebODM by running $0 start"
elif [[ $1 = "checkenv" ]]; then
	environment_check
elif [[ $1 = "resetadminpassword" ]]; then
	resetpassword $2
else
	usage
fi
