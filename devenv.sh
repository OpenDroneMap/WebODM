#!/bin/bash
set -eo pipefail
__dirname=$(cd $(dirname "$0"); pwd -P)

${__dirname}/webodm.sh checkenv

usage(){
  echo "Usage: $0 <command> [options]"
  echo
  echo "This program helps to setup a development environment for WebODM using docker."
  echo 
  echo "Command list:"
  echo "	start			Start the development environment"
  echo "	stop			Stop the development environment"
  echo "	runtests		Run unit tests"
  exit
}

run(){
	echo $1
	eval $1
}

start(){
	run "docker-compose -f docker-compose.yml -f docker-compose.nodeodm.yml -f docker-compose.dev.yml up"
}

stop(){
	run "${__dirname}/webodm.sh stop"
}

runtests(){
	run "docker-compose exec webapp /bin/bash -c \"/webodm/webodm.sh test\""
}

if [[ $1 = "start" ]]; then
	echo "Starting development environment..."
	start
elif [[ $1 = "stop" ]]; then
	echo "Stopping development environment..."
	stop
elif [[ $1 = "runtests" ]]; then
	echo "Starting tests..."
	runtests "$2"
else
	usage
fi
