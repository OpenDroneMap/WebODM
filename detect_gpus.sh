#!/usr/bin/env bash

set -uxo
set +e

function detectGPUs() {
    lspci | grep 'VGA.*NVIDIA'
    if [ "${?}" -eq 0 ]; then
        export GPU_NVIDIA=true
        return
    fi

    lspci | grep "VGA.*Intel"
    if [ "${?}" -eq 0 ]; then
        export GPU_INTEL=true
        return
    fi

    # Total guess.  Need to look into AMD.
    lspci | grep "VGA.*AMD"
    if [ "${?}" -eq 0 ]; then
        export GPU_INTEL=true
    fi
}

export GPU_AMD=false
export GPU_INTEL=false
export GPU_NVIDIA=false

detectGPUs
