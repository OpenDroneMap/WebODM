#!/bin/bash
set -eo pipefail
__dirname=$(cd $(dirname "$0"); pwd -P)
cd ${__dirname}

usage(){
  echo "Usage: $0 <command>"
  echo
  echo "This program manages the background worker processes. WebODM requires at least one background process worker to be running at all times."
  echo 
  echo "Command list:"
  echo "	start		Start background worker"
  exit
}

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
	check_command "celery" "Run \033[1msudo pip install -U celery\033[0m" "pip install -U celery"
	if [[ -z "$WO_BROKER" ]]; then
		echo -e "\033[91mWO_BROKER environment variable is not set. Defaulting to redis://localhost\033[39m"
		export WO_BROKER=redis://localhost
	fi
}


start(){
	action=$1

	echo "Starting worker using broker at $WO_BROKER"
	celery -A worker worker --loglevel=info
}

if [[ $1 = "start" ]]; then
	environment_check
	start
else
	usage
fi
