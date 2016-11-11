# WebODM

[![Build Status](https://travis-ci.org/OpenDroneMap/WebODM.svg?branch=master)](https://travis-ci.org/OpenDroneMap/WebODM)

A free, user-friendly, extendable application and API for drone image processing.

![Alt text](/screenshots/ui-mockup.png?raw=true "WebODM")

![Alt text](/screenshots/dashboard.png?raw=true "Dashboard")

If you know Python, web technologies (JS, HTML, CSS, etc.) or both, make a fork, contribute something that interests you, and make a pull request! All ideas are considered and people of all skill levels are welcome.

## Getting Started

The quickest way to get started is by using Docker.

* From the Docker Quickstart Terminal (Windows / OSX) or from the command line (Linux) type:
```
git clone https://github.com/OpenDroneMap/WebODM
cd WebODM
pip install docker-compose
docker-compose up
```

* If you're on Windows/OSX, find the IP of your Docker machine by running this command from your Docker Quickstart Terminal:

```
docker-machine ip
```

Linux users can connect to 127.0.0.1.

* Open a Web Browser to `http://<yourDockerMachineIp>:8000`
* Log in with the default credentials: "admin:admin"

## Run it natively

If you want to run WebODM natively, you will need to install:
 * PostgreSQL (>= 9.5)
 * PostGIS 2.3
 * Python 3.5

On Linux, make sure you have:

```
apt-get install binutils libproj-dev gdal-bin
```

On Windows use the [OSGeo4W](https://trac.osgeo.org/osgeo4w/) installer to install GDAL.

Then these steps should be sufficient to get you up and running:

```
git clone https://github.com/OpenDroneMap/WebODM
```

Create a `WebODM\webodm\local_settings.py` file containing:

```
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

Then:

```
pip install -r requirements.txt
npm install -g webpack
npm install
webpack
chmod +x start.sh && ./start.sh
```

If you are getting a `rt_raster_gdal_warp: Could not create GDAL transformation object for output dataset creation`, make sure that your PostGIS installation has PROJ support:

```
SELECT PostGIS_Full_Version();
```

You may also need to set the environment variable PROJSO to the .so or .dll projection library your PostGIS is using. This just needs to have the name of the file. So for example on Windows, you would in Control Panel -> System -> Environment Variables add a system variable called PROJSO and set it to libproj.dll (if you are using proj 4.6.1). You'll have to restart your PostgreSQL service/daemon after this change. [http://postgis.net/docs/manual-2.0/RT_ST_Transform.html](http://postgis.net/docs/manual-2.0/RT_ST_Transform.html)

## Roadmap
- [X] User Registration / Authentication
- [X] UI mockup
- [X] Task Processing
- [X] 2D Map Display 
- [ ] 3D model display
- [X] Cluster management and setup.
- [ ] Mission Planner
- [X] API
- [ ] Documentation
- [ ] Android Mobile App
- [ ] iOS Mobile App
- [ ] Processing Nodes Volunteer Network
- [X] Unit Testing

## Terminology

 - `Project`: A collection of tasks (successfully processed, failed, waiting to be executed, etc.)
 - `Task`: A collection of input aerial images and an optional set of output results derived from the images, including an orthophoto, a georeferenced model and a textured model. A `Task`'s output is processed by OpenDroneMap.
 - `ProcessingNode`: An instance usually running on a separate VM, or on a separate machine which accepts aerial images, runs OpenDroneMap and returns the processed results (orthophoto, georeferenced model, etc.). Each node communicates with WebODM via a lightweight API such as [node-OpenDroneMap](https://www.github.com/pierotofy/node-OpenDroneMap). WebODM manages the distribution of `Task` to different `ProcessingNode` instances.
 - `ImageUpload`: aerial images.
 - `Mission`: A flight path and other information (overlap %, angle, ...) associated with a particular `Task`.
 
![image](https://cloud.githubusercontent.com/assets/1951843/17680196/9bfe878e-6304-11e6-852e-c09f1e02f3c0.png)

![er diagram - webodm 2](https://cloud.githubusercontent.com/assets/1951843/17717379/4a227e28-63d3-11e6-9518-6a63cc1bcd3b.png)
