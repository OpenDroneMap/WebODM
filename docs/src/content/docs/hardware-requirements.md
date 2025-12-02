---
title: Hardware Requirements
template: doc
---

To run a standalone installation of WebODM (the user interface), including the processing component ([NodeODM](https://github.com/OpenDroneMap/NodeODM)), we recommend at a minimum:

* 100 GB free disk space
* 16 GB RAM

Don't expect to process more than a few hundred images with these specifications. To process larger datasets, add more RAM linearly to the number of images you want to process:

| Number of Images | RAM or RAM + Swap (GB) |
| ---------------- | ---------------------- |
| 40               | 4                      |
| 250              | 16                     |
| 500              | 32                     |
| 1500             | 64                     |
| 2500             | 128                    |
| 3500             | 192                    |
| 5000             | 256                    |

:::note

These are conservative estimates. A lot of factors influence memory usage, such as image dimensions, flight altitude and processing settings. So you might be able to process more images with less memory than reported above.

:::

A CPU with more cores will speed up processing, but can increase memory usage. GPU acceleration is also supported on Linux and WSL. To make use of your CUDA-compatible graphics card, make sure to pass `--gpu` when starting WebODM. You need the nvidia-docker installed in this case, see https://github.com/NVIDIA/nvidia-docker and https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html#docker for information on docker/NVIDIA setup.

WebODM runs best on Linux, but works well on Windows and Mac too.

WebODM by itself is just a user interface and does not require many resources. WebODM can be loaded on a machine with just 1 or 2 GB of RAM and work fine without [NodeODM](https://github.com/OpenDroneMap/NodeODM). You can use a processing service such as [webodm.net](https://webodm.net) or run NodeODM on a separate, more powerful machine.