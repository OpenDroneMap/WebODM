#!/bin/bash

# Short script to correct Docker inconsistent behavior with `node-odm` names.
# WebODM expects DNS names in the Docker network for `node-odm` to be something
# like `webodm_node-odm_`. Docker standard names use hyphens `-` instead of
# underscores `_` and DNS name are created accordingly. This discrepancy
# causes the connection failure to the `node-odm` containers.
# This script checks if the container names follow the unexpected form
# `webodm-node-odm-` and change them to `webodm_node-odm_`. It should work
# correctly even if many different `node-odm` instances are started.

dc_msg_ok="\033[92m\033[1m OK\033[0m\033[39m"

BASE_NAME="webodm-node-odm-"
NEW_BASE_NAME="webodm_node-odm_"

# Create a list with all containers matching the pattern for wrong names.
wrong_name_containers=$(docker ps -a --format "{{.Names}}" | grep "^$BASE_NAME")

# If everything looks right, exit.
if [[ -z "$wrong_name_containers" ]]; then
    exit 0
fi

# Create a list with all containers matching the pattern for correct names.
right_name_containers=$(docker ps -a --format "{{.Names}}" | grep "^$NEW_BASE_NAME")

# Rename all items in wrong_name_containers.
for wrong_container in $wrong_name_containers; do
    echo -e "\033[93mWarning\033[0m: some containers have in the name - instead of _."
    echo "Initializing correction ..."
    suffix=${wrong_container#$BASE_NAME}
    new_name="${NEW_BASE_NAME}${suffix}"
    # Check if the new name has been previously assigned.
    for right_container in "${right_name_containers[@]}"; do
        if [[ "$new_name" == "$right_container" ]]; then
            echo -e "\033[91mWarning\033[0m: $new_name is already a container. Skipped."
            echo "Please, check if $right_container name is correct."
        # Otherwise, proceed. Exit on error.
            else
            {
            docker rename "$wrong_container" "$new_name" 
            echo -e "Renaming container $wrong_container to $new_name... $dc_msg_ok"
            } || {
            echo -e "\033[91mFailed to rename container $wrong_container.\033[0m"
            exit 1
            }
        fi
    done
done

exit 0