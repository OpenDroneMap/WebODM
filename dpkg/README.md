# WebODM Debian Package
This directory contains scripts to build a Debian package which, in turn, will install WebODM and its dependencies.

## OS Support
It has been tested on Ubuntu 18.04 and 20.04, but should work on other Debian-based systems.

## GPU Support
NIVIDA and Intel hardware are detected and installation/configuration is customized accordingly.  AMD is not currently supported, but could be added with help from someone with hardware and/or experience.

## Building the Debian Package
### To build the package, run:
```
./build.sh
```

This script will collect the necessary components and put them in a directory unique to the package version (e.g. `/path/to/WebODM/dpkg/build/webodm_1.9.7-1`).  If that directory already exists, then it will be deleted first.

This directory will then be used to build the Debian package, and bundles it together with an install script (e.g. `/path/to/WebODM/dpkg/deb/webodm_1.9.7-1`).

## Installing the Debian Package
### To install the package, run:
```
./install.sh
```

This script will first attempt to detect GPU hardware and install the appropriate drivers.  It will then use `dpkg` to install the package.  You will be prompted before anything is installed.

If all goes well, then this will leave you with a `systemd` service, named `webodm-docker.service`.

### View the status of the service:
```
sudo systemctl status webodm-docker
```

### Stop the service:
```
sudo systemctl stop webodm-docker
```

### Start the service:
```
sudo systemctl start webodm-docker
```

### Restart the service:
```
sudo systemctl restart webodm-docker
```

### View service logs:
```
journalctl -u webodm-docker.service
```
