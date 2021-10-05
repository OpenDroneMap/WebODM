#!/usr/bin/env bash

set -ux

HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

WEBODM_VERSION=1.9.7
WEBODM_DPKG_VERSION=1
WEBODM_DPKG_NAME="webodm_${WEBODM_VERSION}-${WEBODM_DPKG_VERSION}"

function aptFixInstall() {
    echo "aptFixInstall"
    sudo apt update
    sudo apt --fix-missing --fix-broken install
}

function ensureDocker() {
    if ! command -v docker &> /dev/null; then
        sudo apt install docker.io
    fi
}

function ensureIntelOpenCL() {
    if [ "${GPU_INTEL}" = false ]; then
        return
    fi

    INTEL_COMPUTE_RUNTIME_VERSION="21.38.21026"
    INTEL_GRAPHICS_COMPILER_VERSION="1.0.8708"

    INTEL_COMPUTE_RUNTIME_DOWNLOAD_URL="https://github.com/intel/compute-runtime/releases/download/${INTEL_COMPUTE_RUNTIME_VERSION}"
    INTEL_GRAPHICS_COMPILER_DOWNLOAD_URL="https://github.com/intel/intel-graphics-compiler/releases/download/igc-${INTEL_GRAPHICS_COMPILER_VERSION}"

    INTEL_GMMLIB_VERSION="21.2.1"
    INTEL_LEVEL_ZERO_GPU_VERSION="1.2.21026"

    dpkg -l intel-gmmlib | grep "${INTEL_GMMLIB_VERSION}"
    INTEL_GMMLIB="${?}"

    dpkg -l intel-igc-core | grep "${INTEL_GRAPHICS_COMPILER_VERSION}"
    INTEL_IGC_CORE="${?}"

    dpkg -l intel-igc-opencl | grep "${INTEL_GRAPHICS_COMPILER_VERSION}"
    INTEL_IGC_OPENCL="${?}"

    dpkg -l intel-opencl | grep "${INTEL_COMPUTE_RUNTIME_VERSION}"
    INTEL_OPENCL="${?}"

    dpkg -l intel-ocloc | grep "${INTEL_COMPUTE_RUNTIME_VERSION}"
    INTEL_OCLOC="${?}"

    dpkg -l intel-level-zero-gpu | grep "${INTEL_LEVEL_ZERO_GPU_VERSION}"
    INTEL_LEVEL_ZERO_GPU="${?}"

    if [ "${INTEL_GMMLIB}" -ne 0 ] || [ "${INTEL_IGC_CORE}" -ne 0 ] || [ "${INTEL_IGC_OPENCL}" -ne 0 ] || [ "${INTEL_OPENCL}" -ne 0 ] || [ "${INTEL_OCLOC}" -ne 0 ]; then
        sudo apt-get update
        sudo apt-get install --no-install-recommends ocl-icd-libopencl1 curl
        sudo rm -rf /var/lib/apt/lists/*
        TEMP_DIR=/tmp/opencl
        sudo mkdir -p "${TEMP_DIR}"

        if [ "${INTEL_GMMLIB}" -ne 0 ]; then
            sudo curl -L "${INTEL_COMPUTE_RUNTIME_DOWNLOAD_URL}/intel-gmmlib_${INTEL_GMMLIB_VERSION}_amd64.deb" --output "${TEMP_DIR}/intel-gmmlib_${INTEL_GMMLIB_VERSION}_amd64.deb"
        fi

        if [ "${INTEL_IGC_CORE}" -ne 0 ]; then
            sudo curl -L "${INTEL_GRAPHICS_COMPILER_DOWNLOAD_URL}/intel-igc-core_${INTEL_GRAPHICS_COMPILER_VERSION}_amd64.deb" --output "${TEMP_DIR}/intel-igc-core${INTEL_GRAPHICS_COMPILER_VERSION}_amd64.deb"
        fi

        if [ "${INTEL_IGC_OPENCL}" -ne 0 ]; then
            sudo curl -L "${INTEL_GRAPHICS_COMPILER_DOWNLOAD_URL}/intel-igc-opencl_${INTEL_GRAPHICS_COMPILER_VERSION}_amd64.deb" --output "${TEMP_DIR}/intel-igc-core${INTEL_GRAPHICS_COMPILER_VERSION}_amd64.deb"
        fi

        if [ "${INTEL_OPENCL}" -ne 0 ]; then
            sudo curl -L "${INTEL_COMPUTE_RUNTIME_DOWNLOAD_URL}/intel-opencl_${INTEL_COMPUTE_RUNTIME_VERSION}_amd64.deb" --output "${TEMP_DIR}/intel-gmmlib_${INTEL_COMPUTE_RUNTIME_VERSION}_amd64.deb"
        fi

        if [ "${INTEL_OCLOC}" -ne 0 ]; then
            sudo curl -L "${INTEL_COMPUTE_RUNTIME_DOWNLOAD_URL}/intel-ocloc_${INTEL_COMPUTE_RUNTIME_VERSION}_amd64.deb" --output "${TEMP_DIR}/intel-ocloc_${INTEL_COMPUTE_RUNTIME_VERSION}_amd64.deb"
        fi

        if [ "${INTEL_LEVEL_ZERO_GPU}" -ne 0 ]; then
            sudo curl -L "${INTEL_COMPUTE_RUNTIME_DOWNLOAD_URL}/intel-level-zero-gpu_${INTEL_LEVEL_ZERO_GPU_VERSION}_amd64.deb" --output "${TEMP_DIR}/intel-level-zero-gpu_${INTEL_LEVEL_ZERO_GPU_VERSION}_amd64.deb"
        fi

        sudo dpkg -i "${TEMP_DIR}/"*.deb
        sudo ldconfig
        sudo rm -Rf "${TEMP_DIR}"
        sudo apt-get update
        sudo apt install clinfo
    fi
}

function ensureNVIDIAOpenCL() {
    if [ "${GPU_NVIDIA}" = false ]; then
        return
    fi

    RECOMMENDED_DRIVER=$(ubuntu-drivers devices | grep "nvidia.*recommended" | cut -d' ' -f5)
    if [ -z "${RECOMMENDED_DRIVER}" ]; then
        echo "Unable to find a recommended NVIDIA driver."
        exit 1
    fi

    sudo apt install "${RECOMMENDED_DRIVER}"
}

function ensureOpenCL() {
    source "${HERE}/detect_gpus.sh"

    if [ "${GPU_NVIDIA}" = true ]; then
        ensureNVIDIAOpenCL
    fi

    if [ "${GPU_INTEL}" = true ]; then
        ensureIntelOpenCL
    fi
}

function install() {
    ensureOpenCL
    ensureDocker
    sudo dpkg -i "${HERE}/${WEBODM_DPKG_NAME}.deb"
}

function uninstall() {
    sudo dpkg --purge webodm
}

uninstall || echo "Skipping uninstall."
install || aptFixInstall

