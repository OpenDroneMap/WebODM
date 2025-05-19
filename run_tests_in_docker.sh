#!/bin/bash

export COMPOSE_FILE=docker-compose.yml:docker-compose.build.yml
WAIT_SECONDS=20

# Function to run on script exit (success or failure)
cleanup() {
  echo "🧹 Cleaning up Docker environment..."
  docker compose down -v --remove-orphans
}

# Register the cleanup function to run on script exit
trap cleanup EXIT

# Stop on first error for build and up
set -e

echo "🔨 Building and starting containers..."
docker compose build --build-arg TEST_BUILD=ON
docker compose up --wait

# Wait for services to be ready
echo "⏳ Waiting $WAIT_SECONDS for services to initialize..."
sleep $WAIT_SECONDS

echo "🧪 Running tests..."
# Pass remaining arguments
docker compose exec -T webapp /webodm/webodm.sh test "$@"

echo "✅ Tests completed successfully!"
