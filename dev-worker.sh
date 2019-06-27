#!/bin/bash
# Launch a development worker so that changes in a dev
# environment can be refreshed

docker stop worker
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --entrypoint bash worker
