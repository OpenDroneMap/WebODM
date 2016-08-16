# WebODM

A web interface for [OpenDroneMap](https://github.com/OpenDroneMap/OpenDroneMap).

## Roadmap
- [X] User Registration / Authentication
- [ ] UI mockup
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
 - `ProcessingNode`: An instance usually running on a separate VM instance, or on a separate machine which accepts aerial images, runs OpenDroneMap and returns the processed results (orthophoto, georeferenced model, etc.). Each node communicates with WebODM via a lightweight API such as [node-OpenDroneMap](https://www.github.com/pierotofy/node-OpenDroneMap). WebODM manages the distribution of `Task` to different `ProcessingNode` instances.
 - `ImageUpload`: aerial images.
 - `Mission`: A flight path and other information (overlap %, angle, ...) associated with a particular `Task`.
 
![image](https://cloud.githubusercontent.com/assets/1951843/17680196/9bfe878e-6304-11e6-852e-c09f1e02f3c0.png)

![er diagram - webodm 2](https://cloud.githubusercontent.com/assets/1951843/17717379/4a227e28-63d3-11e6-9518-6a63cc1bcd3b.png)


## Work in progress

We will add more information to this document soon (including information on how to get started).
