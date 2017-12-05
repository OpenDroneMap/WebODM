# WebODM

[![Build Status](https://travis-ci.org/OpenDroneMap/WebODM.svg?branch=master)](https://travis-ci.org/OpenDroneMap/WebODM) [![Join Gitter Chat](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/OpenDroneMap/web-development) [![GitHub version](https://badge.fury.io/gh/OpenDroneMap%2FWebODM.svg)](https://badge.fury.io/gh/OpenDroneMap%2FWebODM)

A free, user-friendly, extendable application and [API](http://docs.webodm.org) for drone image processing. Generate georeferenced maps, point clouds, elevation models and textured 3D models from aerial images. It uses [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap) for processing.


![image](https://user-images.githubusercontent.com/1951843/33631371-5c55cc2c-d9d8-11e7-8609-b9032d4bbbb6.png)


* [Getting Started](#getting-started)
    * [Add More Processing Nodes](#add-more-processing-nodes)
    * [Security](#security)
    * [Enable SSL](#enable-ssl)
    * [Where Are My Files Stored?](#where-are-my-files-stored)
    * [Common Troubleshooting](#common-troubleshooting)
 * [API Docs](#api-docs)
 * [OpenDroneMap, node-OpenDroneMap, WebODM... what?](#opendronemap-node-opendronemap-webodm-what)
 * [Roadmap](#roadmap)
 * [Getting Help](#getting-help)
 * [Support the Project](#support-the-project)
 * [Become a Contributor](#become-a-contributor)
 * [Run the docker version as a Linux Service](#run-the-docker-version-as-a-linux-service)
 * [Run it natively](#run-it-natively)
 

![Alt text](https://user-images.githubusercontent.com/1951843/28586405-af18e8cc-7141-11e7-9853-a7feca7c9c6b.gif)

![Alt text](/screenshots/pointcloud.png?raw=true "3D Display")


## Getting Started

* Install the following applications (if they are not installed already):
 - [Docker](https://www.docker.com/)
 - [Python](https://www.python.org/downloads/)
 - [Git](https://git-scm.com/downloads)

* From the Docker Quickstart Terminal (Windows) or from the command line (Mac / Linux) type:
```bash
git clone https://github.com/OpenDroneMap/WebODM --config core.autocrlf=input
cd WebODM
./webodm.sh start
```

* If you're on Windows find the IP of your Docker machine by running this command from your Docker Quickstart Terminal:

```bash
docker-machine ip
```

Linux / Mac, users can connect to 127.0.0.1.

* Open a Web Browser to `http://<yourDockerMachineIp>:8000`

To stop WebODM press CTRL+C or run:

```
./webodm.sh stop
```

To update WebODM to the latest version use:

```bash
./webodm.sh update
```

We recommend that you read the [Docker Documentation](https://docs.docker.com/) to familiarize with the application lifecycle, setup and teardown, or for more advanced uses. Look at the contents of the webodm.sh script to understand what commands are used to launch WebODM.

For Windows users an [Installer](https://www.webodm.org/installer) is also available.

### Add More Processing Nodes

WebODM can be linked to one or more processing nodes running [node-OpenDroneMap](https://github.com/OpenDroneMap/node-OpenDroneMap). The default configuration already includes a "node-odm-1" processing node which runs on the same machine as WebODM, just to help you get started. As you become more familiar with WebODM, you might want to install processing nodes on separate machines.

Adding more processing nodes will allow you to run multiple jobs in parallel. 

You **will not be able to distribute a single job across multiple processing nodes**. We are actively working to bring this feature to reality, but we're not there yet. 

### Security

If you want to run WebODM in production, make sure to pass the `--no-debug` flag while starting WebODM:

```bash
./webodm.sh down && ./webodm.sh start --no-debug
```

This will disable the `DEBUG` flag from `webodm/settings.py` within the docker container. This is [really important](https://docs.djangoproject.com/en/1.11/ref/settings/#std:setting-DEBUG).

### Enable SSL

WebODM has the ability to automatically request and install a SSL certificate via [Let’s Encrypt](https://letsencrypt.org/), or you can manually specify your own key/certificate pair.

 - Setup your DNS record (webodm.myorg.com --> IP of server).
 - Make sure port 80 and 443 are open.
 - Run the following:

```bash
./webodm.sh down && ./webodm.sh start --ssl --hostname webodm.myorg.com
```

That's it! The certificate will automatically renew when needed.

If you want to specify your own key/certificate pair, simply pass the `--ssl-key` and `--ssl-cert` option to `./webodm.sh`. See `./webodm.sh --help` for more information.

### Where Are My Files Stored?

When using Docker, all processing results are stored in a docker volume and are not available on the host filesystem. If you want to store your files on the host filesystem instead of a docker volume, you need to pass a path via the `--media-dir` option:

```bash
./webodm.sh down && ./webodm.sh start --media-dir /home/user/webodm_data
```

Note that existing task results will not be available after the change. Refer to the [Migrate Data Volumes](https://docs.docker.com/engine/tutorials/dockervolumes/#backup-restore-or-migrate-data-volumes) section of the Docker documentation for information on migrating existing task results.

### Common Troubleshooting

Sympthoms | Possible Solutions
--------- | ------------------
While starting WebODM you get: `from six.moves import _thread as thread ImportError: cannot import name _thread` | Try running: `sudo pip install --ignore-installed six`
While starting WebODM you get: `could not translate host name “db” to address: Name or service not known` | Try restarting your computer, then type: `./webodm.sh down && ./webodm.sh start`
Task output or console shows one of the following:<ul><li>`MemoryError`</li><li>`Killed`</li></ul> |  Make sure that your Docker environment has enough RAM allocated: [MacOS Instructions](http://stackoverflow.com/a/39720010), [Windows Instructions](https://docs.docker.com/docker-for-windows/#advanced)
After an update, you get: `django.contrib.auth.models.DoesNotExist: Permission matching query does not exist.` | Try to remove your WebODM folder and start from a fresh git clone
Task fails with `Process exited with code null`, no task console output | If the computer running node-opendronemap is using an old or 32bit CPU, you need to compile [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap) from sources and setup node-opendronemap natively. You cannot use docker. Docker images work with CPUs with 64-bit extensions, MMX, SSE, SSE2, SSE3 and SSSE3 instruction set support or higher.
On Windows, docker-compose fails with `Failed to execute the script docker-compose` | Make sure you have enabled VT-x virtualization in the BIOS
Cannot access WebODM using Microsoft Edge on Windows 10 | Try to tweak your internet properties according to [these instructions](http://www.hanselman.com/blog/FixedMicrosoftEdgeCantSeeOrOpenVirtualBoxhostedLocalWebSites.aspx)
Getting a `No space left on device` error, but hard drive has enough space left | Docker on Windows by default will allocate only 20GB of space to the default docker-machine. You need to increase that amount. See [this link](http://support.divio.com/local-development/docker/managing-disk-space-in-your-docker-vm) and [this link](https://www.howtogeek.com/124622/how-to-enlarge-a-virtual-machines-disk-in-virtualbox-or-vmware/)
Cannot start WebODM via `./webodm.sh start`, error messages are different at each retry | You could be running out of memory. Make sure you have enough RAM available. 2GB should be the recommended minimum, unless you know what you are doing

Have you had other issues? Please [report them](https://github.com/OpenDroneMap/WebODM/issues/new) so that we can include them in this document.

## API Docs

See the [API documentation page](http://docs.webodm.org).

## OpenDroneMap, node-OpenDroneMap, WebODM... what?

The [OpenDroneMap project](https://github.com/OpenDroneMap/) is composed of several components.

- [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap) is a command line toolkit that processes aerial images. Users comfortable with the command line are probably OK using this component alone.
- [node-OpenDroneMap](https://github.com/OpenDroneMap/node-OpenDroneMap) is a lightweight interface and API (Application Program Interface) built directly on top of [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap). Users not comfortable with the command line can use this interface to process aerial images and developers can use the API to build applications. Features such as user authentication, map displays, etc. are not provided.
- [WebODM](https://github.com/OpenDroneMap/WebODM) adds more features such as user authentication, map displays, 3D displays, a higher level API and the ability to orchestrate multiple processing nodes (run jobs in parallel). Processing nodes are simply servers running [node-OpenDroneMap](https://github.com/OpenDroneMap/node-OpenDroneMap).

![webodm](https://cloud.githubusercontent.com/assets/1951843/25567386/5aeec7aa-2dba-11e7-9169-aca97b70db79.png)

In general, follow these guidelines to find out what you should use:

I am a... | Best choice
--------- | -----------
End user, I'm not really comfortable with the command line | [WebODM](https://github.com/OpenDroneMap/WebODM)
End user, I like shell commands, I need to process images for myself. I use other software to display processing results |  [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap)
End user, I can work with the command line, but I'd rather not. I use other software to display processing results  |  [node-OpenDroneMap](https://github.com/OpenDroneMap/node-OpenDroneMap)
End user, I need a drone mapping application for my organization that everyone can use. | [WebODM](https://github.com/OpenDroneMap/WebODM)
Developer, I'm looking to build an app that displays map results and takes care of things like permissions | [WebODM](https://github.com/OpenDroneMap/WebODM)
Developer, I'm looking to build an app that will stay behind a firewall and just needs raw results | [node-OpenDroneMap](https://github.com/OpenDroneMap/node-OpenDroneMap)

## Roadmap
- [X] User Registration / Authentication
- [X] UI mockup
- [X] Task Processing
- [X] 2D Map Display 
- [X] 3D Model Display
- [ ] NDVI display
- [ ] Volumetric Measurements
- [X] Cluster management and setup.
- [ ] Mission Planner
- [ ] Plugins/Webhooks System
- [X] API
- [X] Documentation
- [ ] Android Mobile App
- [ ] iOS Mobile App
- [ ] Processing Nodes Volunteer Network
- [X] Unit Testing
- [X] SSL Support

Don't see a feature that you want? [Help us make it happen](/CONTRIBUTING.md). 

## Getting Help

We have several channels of communication for people to ask questions and to get involved with the community:

 - [OpenDroneMap Community Forum](http://community.opendronemap.org/c/webodm)
 - [Report Issues](https://github.com/OpenDroneMap/WebODM/issues)

We also have a [Gitter Chat](https://gitter.im/OpenDroneMap/web-development), but the preferred way to communicate is via the [OpenDroneMap Community Forum](http://community.opendronemap.org/c/webodm).

## Support the Project

There are many ways to contribute back to the project:

 - Help us test new and existing features and report [bugs](https://www.github.com/OpenDroneMap/WebODM/issues) and [feedback](http://community.opendronemap.org/c/webodm).
 - [Share](http://community.opendronemap.org/c/datasets) your aerial datasets.
 - Help answer questions on the community [forum](http://community.opendronemap.org/c/webodm) and [chat](https://gitter.im/OpenDroneMap/web-development).
 - ⭐️ us on GitHub.
 - Spread the word about WebODM and OpenDroneMap on social media.
 - While we don't accept donations, you can purchase an [installer](https://webodm.org/download#installer) or a [premium support package](https://webodm.org/services#premium-support).
 - Become a contributor (see below).

## Become a Contributor

If you know Python, web technologies (JS, HTML, CSS, etc.) or both, it's easy to make a change to WebODM! Make a fork, clone the repository and run `./devenv.sh start`. That's it! See the [Development Quickstart](http://docs.webodm.org/#development-quickstart) and [Contributing](/CONTRIBUTING.md) documents for more information. All ideas are considered and people of all skill levels are welcome to contribute.

## Run the docker version as a Linux Service

If you wish to run the docker version with auto start/monitoring/stop, etc, as a systemd style Linux Service, a systemd unit file is included in the service folder of the repo.

This should work on any Linux OS capable of running WebODM, and using a SystemD based service daemon (such as Ubuntu 16.04 server for example).

This has only been tested on Ubuntu 16.04 server.

The following pre-requisites are required:
 * Requires odm user
 * Requires docker installed via system (ubuntu: `sudo apt-get install docker.io`)
 * Requires screen to be installed
 * Requires odm user member of docker group
 * Required WebODM directory checked out to /opt/WebODM
 * Requires that /opt/WebODM is recursively owned by odm:odm

If all pre-requisites have been met, and repository is checked out to /opt/WebODM folder, then you can use the following steps to enable and manage the service:

First, to install the service, and enable the service to run at startup from now on:
```bash
sudo systemctl enable /opt/WebODM/service/webodm.service
```

To manually stop the service:
```bash
sudo systemctl stop webodm
```

To manually start the service:
```bash
sudo systemctl start webodm
```

To manually check service status:
```bash
sudo systemctl status webodm
```

The service runs within a screen session, so as the odm user you can easily jump into the screen session by using:
```bash
screen -r webodm
```
(if you wish to exit the screen session, don't use ctrl+c, that will kill webodm, use `CTRL+A` then hit the `D` key)

## Run it natively

WebODM can run natively on Windows, MacOS and Linux.

Ubuntu 16.04 LTS users can refer to [this script](/contrib/ubuntu_1604_install.sh) to install WebODM natively on a new machine.

To run WebODM, you will need to install:
 * PostgreSQL (>= 9.5)
 * PostGIS 2.3
 * Python 3.5
 * GDAL (>= 2.1)
 * Node.js (>= 6.0)
 * Nginx (Linux/MacOS) - OR - Apache + mod_wsgi (Windows)

On Linux, make sure you have:

```bash
apt-get install binutils libproj-dev gdal-bin nginx
```

On Windows use the [OSGeo4W](https://trac.osgeo.org/osgeo4w/) installer to install GDAL. MacOS users can use:

```
brew install postgres postgis
```

Then these steps should be sufficient to get you up and running:

```bash
git clone https://github.com/OpenDroneMap/WebODM
```

Create a `WebODM/webodm/local_settings.py` file containing your database settings:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'webodm_dev',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

From psql or [pgadmin](https://www.pgadmin.org), connect to PostgreSQL, create a new database (name it `webodm_dev`), connect to it and set the [postgis.enable_outdb_rasters](http://postgis.net/docs/manual-2.2/postgis_enable_outdb_rasters.html) and [postgis.gdal_enabled_drivers](http://postgis.net/docs/postgis_gdal_enabled_drivers.html) settings:

```sql
ALTER SYSTEM SET postgis.enable_outdb_rasters TO True;
ALTER SYSTEM SET postgis.gdal_enabled_drivers TO 'GTiff';
```

Then:

```bash
pip install -r requirements.txt
sudo npm install -g webpack
npm install
webpack
python manage.py collectstatic --noinput
chmod +x start.sh && ./start.sh --no-gunicorn
```

The `start.sh` script will use Django's built-in server if you pass the `--no-gunicorn` parameter. This is good for testing, but bad for production. 

In production, if you have nginx installed, modify the configuration file in `nginx/nginx.conf` to match your system's configuration and just run `start.sh` without parameters. 

Windows users should refer to [this guide](https://docs.djangoproject.com/en/1.11/howto/deployment/wsgi/modwsgi/) to install Apache + mod_wsgi and run gunicorn:

```bash
gunicorn webodm.wsgi --bind 0.0.0.0:8000 --preload
```

If you are getting a `rt_raster_gdal_warp: Could not create GDAL transformation object for output dataset creation`, make sure that your PostGIS installation has PROJ support:

```sql
SELECT PostGIS_Full_Version();
```

You may also need to set the environment variable PROJSO to the .so or .dll projection library your PostGIS is using. This just needs to have the name of the file. So for example on Windows, you would in Control Panel -> System -> Environment Variables add a system variable called PROJSO and set it to libproj.dll (if you are using proj 4.6.1). You'll have to restart your PostgreSQL service/daemon after this change. [http://postgis.net/docs/manual-2.0/RT_ST_Transform.html](http://postgis.net/docs/manual-2.0/RT_ST_Transform.html)

If you are using Windows and are unable to go past the `pip install -r requirements.txt` command because of an error regarding zlib and Pillow, manually edit the `requirements.txt` file, remove the Pillow requirement and run:

```bash
easy_install pillow
pip install -r requirements.txt
```

On Windows make sure that all of your PATH environment variables are set properly. These commands:

```bash
python --version
pip --version
npm --version
gdalinfo --version
```
Should all work without errors.
