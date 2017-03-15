# WebODM

[![Build Status](https://travis-ci.org/OpenDroneMap/WebODM.svg?branch=master)](https://travis-ci.org/OpenDroneMap/WebODM)

A free, user-friendly, extendable application and [API](https://opendronemap.github.io/WebODM/) for drone image processing. Generate georeferenced maps, point clouds and textured 3D models from aerial images. It uses [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap) for processing.

![Alt text](/screenshots/ui-mockup.png?raw=true "WebODM")

![Alt text](/screenshots/pointcloud.png?raw=true "3D Display")

![Alt text](/screenshots/dashboard.png?raw=true "Dashboard")

[![WebODM - An Introduction to a Web Interface for OpenDroneMap to Make Drone Mapping Even Easier](https://img.youtube.com/vi/UnN-NzL96T8/0.jpg)](https://www.youtube.com/watch?v=UnN-NzL96T8 "WebODM - An Introduction to a Web Interface for OpenDroneMap to Make Drone Mapping Even Easier")

If you know Python, web technologies (JS, HTML, CSS, etc.) or both, it's easy to make a change to WebODM! Make a fork, clone the repository and run `./devenv.sh start`. That's it! See the [Development Quickstart](https://opendronemap.github.io/WebODM/#development-quickstart) and [Contributing](/CONTRIBUTING.md) documents for more information. All ideas are considered and people of all skill levels are welcome to contribute.

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
* Log in with the default credentials: "admin:admin"

To stop WebODM press CTRL+C or run:

```
./webodm.sh stop
```

To update WebODM to the latest version use:

```bash
./webodm.sh update
```

We recommend that you read the [Docker Documentation](https://docs.docker.com/) to familiarize with the application lifecycle, setup and teardown, or for more advanced uses. Look at the contents of the webodm.sh script to understand what commands are used to launch WebODM.

### Common Troubleshooting

Sympthoms | Possible Solutions
--------- | ------------------
While starting WebODM you get: `from six.moves import _thread as thread ImportError: cannot import name _thread` | Try running: `sudo pip install --ignore-installed six`
Task output shows one of the following:<ul><li>`MemoryError`</li><li>`Killed`</li></ul> |  Make sure that your Docker environment has enough RAM allocated. http://stackoverflow.com/a/39720010
After an update, you get: `django.contrib.auth.models.DoesNotExist: Permission matching query does not exist.` | Try to remove your WebODM folder and start from a fresh git clone
Task fails with `Process exited with code null`, no task console output | If the computer running node-opendronemap is using an old or 32bit CPU, you need to compile [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap) from sources and setup node-opendronemap natively. You cannot use docker. Docker images work with CPUs with 64-bit extensions, MMX, SSE, SSE2, SSE3 and SSSE3 instruction set support or higher.

Have you had other issues? Please [report them](https://github.com/OpenDroneMap/WebODM/issues/new) so that we can include them in this document.

### Add More Processing Nodes

WebODM can be linked to one or more processing nodes running [node-OpenDroneMap](https://github.com/pierotofy/node-OpenDroneMap). The default configuration already includes a "node-odm-1" processing node which runs on the same machine as WebODM, just to help you get started. As you become more familiar with WebODM, you might want to install processing nodes on separate machines.

### Security

If you want to run WebODM in production, make sure to change the `SECRET_KEY` variable in `webodm/settings.py`, as well as any other relevant setting as indicated in the [Django Deployment Checklist](https://docs.djangoproject.com/en/1.10/howto/deployment/checklist/).

## API Docs

See the [API documentation page](https://opendronemap.github.io/WebODM/).

## Run it natively

If you want to run WebODM natively, you will need to install:
 * PostgreSQL (>= 9.5)
 * PostGIS 2.3
 * Python 3.5
 * GDAL (>= 2.1)
 * Node.js (>= 6.0)

On Linux, make sure you have:

```bash
apt-get install binutils libproj-dev gdal-bin
```

On Windows use the [OSGeo4W](https://trac.osgeo.org/osgeo4w/) installer to install GDAL. MacOS users can use:

```
brew install postgres postgis
```

Then these steps should be sufficient to get you up and running:

```bash
git clone https://github.com/OpenDroneMap/WebODM
```

Create a `WebODM\webodm\local_settings.py` file containing your database settings:

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

From psql or [pgadmin](https://www.pgadmin.org), connect to the database and set the [postgis.enable_outdb_rasters](http://postgis.net/docs/manual-2.2/postgis_enable_outdb_rasters.html) and [postgis.gdal_enabled_drivers](http://postgis.net/docs/postgis_gdal_enabled_drivers.html) settings:

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
chmod +x start.sh && ./start.sh
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

## Roadmap
- [X] User Registration / Authentication
- [X] UI mockup
- [X] Task Processing
- [X] 2D Map Display 
- [X] 3D Model Display
- [ ] Volumetric Measurements
- [X] Cluster management and setup.
- [ ] Mission Planner
- [X] API
- [X] Documentation
- [ ] Android Mobile App
- [ ] iOS Mobile App
- [ ] Processing Nodes Volunteer Network
- [X] Unit Testing

Don't see a feature that you want? [Help us make it happen](/CONTRIBUTING.md). 

## Terminology

 - `Project`: A collection of tasks (successfully processed, failed, waiting to be executed, etc.)
 - `Task`: A collection of input aerial images and an optional set of output results derived from the images, including an orthophoto, a georeferenced model and a textured model. A `Task`'s output is processed by OpenDroneMap.
 - `ProcessingNode`: An instance usually running on a separate VM, or on a separate machine which accepts aerial images, runs OpenDroneMap and returns the processed results (orthophoto, georeferenced model, etc.). Each node communicates with WebODM via a lightweight API such as [node-OpenDroneMap](https://www.github.com/pierotofy/node-OpenDroneMap). WebODM manages the distribution of `Task` to different `ProcessingNode` instances.
 - `ImageUpload`: aerial images.
 - `Mission`: A flight path and other information (overlap %, angle, ...) associated with a particular `Task`.

