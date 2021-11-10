#!/bin/bash
set -eo pipefail
__dirname=$(cd $(dirname "$0"); pwd -P)
cd "${__dirname}"


# Only execute if TEST_BUILD is not set
if [[ -z ${TEST_BUILD+x} ]]; then
    rm -fr external/NodeODM
else
    echo "Nothing to do"
fi
