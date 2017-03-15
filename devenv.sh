#!/bin/bash
set -eo pipefail

./webodm.sh checkenv

usage(){
  echo "Usage: $0 <command> [options]"
  echo
  echo "This program helps to setup a development environment for WebODM using docker."
  echo 
  echo "Command list:"
  echo "	start		Start the development environment"
  echo "	stop		Stop the development environment"
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
	./webodm.sh stop
}

if [[ $1 = "start" ]]; then
	echo "Starting development environment..."
	start
else
	usage
fi
