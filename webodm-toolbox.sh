#!/bin/bash
set -eo pipefail

# Get the toolbox container IP for host access
TOOLBOX_IP=$(hostname -I | awk '{print $1}')
echo "Toolbox IP: $TOOLBOX_IP"
echo "WebODM will be accessible at: http://$TOOLBOX_IP:8000"
echo "Or from host at: http://localhost:8000 (if port forwarding is set up)"

# Set environment variables for host access
export WO_HOST=0.0.0.0  # Allow connections from any IP
export WO_PORT=8000

# Use host's Docker socket if available, otherwise use podman
if [ -S /var/run/docker.sock ]; then
    export DOCKER_HOST=unix:///var/run/docker.sock
else
    export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
fi

# Export COMPOSE_FILE to include toolbox-specific overrides
# docker-compose.toolbox.yml adds SELinux labels needed for Fedora/Podman
export COMPOSE_FILE=docker-compose.yml:docker-compose.toolbox.yml

# Run the original webodm.sh with podman
exec ./webodm.sh "$@"
