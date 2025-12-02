---
title: Architecture
template: doc
---

The [OpenDroneMap project](https://github.com/OpenDroneMap/) is composed of several components.

- [ODM](https://github.com/OpenDroneMap/ODM) is a command line toolkit that processes aerial images. Users comfortable with the command line are probably OK using this component alone.
- [NodeODM](https://github.com/OpenDroneMap/NodeODM) is a lightweight interface and API (Application Program Interface) built directly on top of [ODM](https://github.com/OpenDroneMap/ODM). Users not comfortable with the command line can use this interface to process aerial images and developers can use the API to build applications. Features such as user authentication, map displays, etc. are not provided.
- [WebODM](https://github.com/OpenDroneMap/WebODM) adds more features such as user authentication, map displays, 3D displays, a higher level API and the ability to orchestrate multiple processing nodes (run jobs in parallel). Processing nodes are simply servers running [NodeODM](https://github.com/OpenDroneMap/NodeODM).

![webodm](https://cloud.githubusercontent.com/assets/1951843/25567386/5aeec7aa-2dba-11e7-9169-aca97b70db79.png)

WebODM is built with scalability and performance in mind. While the default setup places all databases and applications on the same machine, users can separate its components for increased performance (ex. place a Celery worker on a separate machine for running background tasks).

![Architecture](https://user-images.githubusercontent.com/1951843/36916884-3a269a7a-1e23-11e8-997a-a57cd6ca7950.png)

A few things to note:
 * We use Celery workers to do background tasks such as resizing images and processing task results, but we use an ad-hoc scheduling mechanism to communicate with NodeODM (which processes the orthophotos, 3D models, etc.). The choice to use two separate systems for task scheduling is due to the flexibility that an ad-hoc mechanism gives us for certain operations (capture task output, persistent data and ability to restart tasks mid-way, communication via REST calls, etc.).
 * If loaded on multiple machines, Celery workers should all share their `app/media` directory with the Django application (via network shares). You can manage workers via `./worker.sh`