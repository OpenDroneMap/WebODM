# WebODM

A web interface for [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap).

![Alt text](/screenshots/ui-mockup.png?raw=true "WebODM")

This is currently a work in progress! See the Roadmap below.

## Getting Started

The quickest way to get started is by using Docker.

* From the Docker Quickstart Terminal (Windows / OSX) or from the command line (Linux) type:
```
git clone https://github.com/OpenDroneMap/WebODM
cd WebODM
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
 * Python 2.7

Then these steps should be sufficient to get you up and running:

```
git clone https://github.com/OpenDroneMap/WebODM
```

Create a `WebODM\webodm\local_settings.py` file containing:

```
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
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
chmod +x start.sh && ./start.sh
```

## Roadmap
- [X] User Registration / Authentication
- [X] UI mockup
- [ ] Task Processing
- [ ] Model display (using Cesium/Leaflet) for both 2D and 3D outputs.
- [ ] Cluster management and setup.
- [ ] Mission Planner
- [ ] API
- [ ] Documentation
- [ ] Unit Testing

## Terminology

 - `Project`: A collection of tasks (successfully processed, failed, waiting to be executed, etc.)
 - `Task`: A collection of input aerial images and an optional set of output results derived from the images, including an orthophoto, a georeferenced model and a textured model. A `Task`'s output is processed by OpenDroneMap.
 - `ProcessingNode`: An instance usually running on a separate VM, or on a separate machine which accepts aerial images, runs OpenDroneMap and returns the processed results (orthophoto, georeferenced model, etc.). Each node communicates with WebODM via a lightweight API such as [node-OpenDroneMap](https://www.github.com/pierotofy/node-OpenDroneMap). WebODM manages the distribution of `Task` to different `ProcessingNode` instances.
 - `ImageUpload`: aerial images.
 - `Mission`: A flight path and other information (overlap %, angle, ...) associated with a particular `Task`.
 
![image](https://cloud.githubusercontent.com/assets/1951843/17680196/9bfe878e-6304-11e6-852e-c09f1e02f3c0.png)

![er diagram - webodm 2](https://cloud.githubusercontent.com/assets/1951843/17717379/4a227e28-63d3-11e6-9518-6a63cc1bcd3b.png)


## Work in progress

We will add more information to this document soon.
