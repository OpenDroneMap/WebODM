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

usage(){
  echo "Usage: $0 <command> [options]"
  echo
  echo "This program helps to manage the setup/teardown of the docker containers for running WebODM. We recommend that you read the full documentation of docker at https://docs.docker.com if you want to customize your setup."
  echo 
  echo "Command list:"
  echo "	start		Start WebODM"
  echo "	stop		Stop WebODM"
  echo "	update		Update WebODM to the latest release"
  echo "	rebuild		Rebuild all docker containers and perform cleanups"
  exit
}

check_command(){
	check_msg="\033[92m\033[1m OK\033[0m\033[39m"
	hash $1 2>/dev/null || not_found=true 
	if [[ $not_found ]]; then
		check_msg="\033[91m can't find $1! Check that the program is installed before launching WebODM. $2\033[39m"
	fi

	echo -e "Checking for $1... $check_msg"
	if [[ $not_found ]]; then
		return 1
	fi
}

environment_check(){
	check_command "docker" "https://www.docker.com/"
	check_command "git" "https://git-scm.com/downloads"
	check_command "python" "https://www.python.org/downloads/"
	check_command "pip" "Run \033[1msudo easy_install pip\033[0m"
	check_command "docker-compose" "Run \033[1mpip install docker-compose\033[0m"	
}

run(){
	echo $1
	$1
}

start(){
	run "docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml up"
}

rebuild(){
	run "docker-compose down"
	run "rm -fr node_modules/"
	run "rm -fr nodeodm/external/node-OpenDroneMap"
	run "docker-compose build --no-cache"
	echo -e "\033[1mDone!\033[0m You can now start WebODM by running ./$0 start"
}

if [[ $1 = "start" ]]; then
	environment_check
	echo "Starting WebODM..."
	start
elif [[ $1 = "stop" ]]; then
	environment_check
	echo "Stopping WebODM..."
	docker-compose down
elif [[ $1 = "rebuild" ]]; then
	environment_check
	echo  "Rebuilding WebODM..."
	rebuild
elif [[ $1 = "update" ]]; then
	echo "Updating WebODM..."
	git pull origin master
	rebuild
else
	usage
fi
