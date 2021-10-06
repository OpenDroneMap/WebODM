#!/usr/bin/env bash

set -euxo

HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

WEBODM_VERSION=1.9.7
WEBODM_DPKG_VERSION=1
WEBODM_DPKG_NAME="webodm_${WEBODM_VERSION}-${WEBODM_DPKG_VERSION}"

BUILD_DIR="${HERE}/build"
DEB_DIR="${HERE}/deb"
WEBODM_DIR="${HERE}/${WEBODM_DPKG_NAME}/opt/WebODM"

function build() {
    prepareBuildDir
    prepareDebDir
    prepareWebODMDir
    moveToBuildDir
    buildDeb
    bundle
}

function buildDeb() {
    dpkg-deb --build "${WEBODM_DPKG_NAME}"
}

function bundle() {
    mkdir -p "${DEB_DIR}/${WEBODM_DPKG_NAME}"
    cp "${HERE}/install.sh" "${DEB_DIR}/${WEBODM_DPKG_NAME}/"
    cp "${BUILD_DIR}/${WEBODM_DPKG_NAME}/${WEBODM_DPKG_NAME}/opt/WebODM/detect_gpus.sh" "${DEB_DIR}/${WEBODM_DPKG_NAME}/"
    cp "${WEBODM_DPKG_NAME}.deb" "${DEB_DIR}/${WEBODM_DPKG_NAME}/"
}

function moveToBuildDir() {
    cd "${BUILD_DIR}/${WEBODM_DPKG_NAME}"
}

function prepareBuildDir() {
    if [ -d "${BUILD_DIR}/${WEBODM_DPKG_NAME}" ]; then
        rm -Rf "${BUILD_DIR}/${WEBODM_DPKG_NAME}"
    fi

    mkdir -p "${BUILD_DIR}/${WEBODM_DPKG_NAME}"
    cp -R "${HERE}/webodm" "${BUILD_DIR}/${WEBODM_DPKG_NAME}/${WEBODM_DPKG_NAME}"
}

function prepareDebDir() {
    if [ -d "${DEB_DIR}" ]; then
        rm -Rf "${DEB_DIR}"
    fi

    mkdir -p "${DEB_DIR}"
}

function prepareWebODMDir() {
    TMP_DIR="/tmp/WebODM"
    if [ -d "${BUILD_DIR}" ]; then
        rm -Rf "${TMP_DIR}"
    fi

    cp -R "${HERE}/.." "${TMP_DIR}"
    mv "${TMP_DIR}" "${BUILD_DIR}/${WEBODM_DPKG_NAME}/${WEBODM_DPKG_NAME}/opt/"
}

build
