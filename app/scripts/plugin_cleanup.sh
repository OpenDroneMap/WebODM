#!/bin/bash
# Delete all node_modules and build directories within plugins' public/ folders

__dirname=$(cd $(dirname "$0"); pwd -P)
cd "${__dirname}/../../"

find plugins/ -type d \( -name build -o -name node_modules \) -path 'plugins/*/public/*' -exec rm -frv '{}' \;
echo "Done!"