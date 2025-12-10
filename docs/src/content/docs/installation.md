---
title: Installation
template: doc
---

There are two ways to install WebODM on your machine:

| Install Method                        | Price | Operating Systems     | Installation Support |
| ------------------------------------- | ----- | --------------------- | -------------------- |
| [WebODM Installer](#webodm-installer) | Paid  | Windows, macOS        | ✅                   |
| [Docker](#docker)                     | Free  | Windows, macOS, Linux | Community            |


:::tip

You can also skip the installation entirely and run WebODM from [webodm.net](https://webodm.net)

:::

## Installation on your machine

### WebODM Installer

Installers are available for purchase from [OpenDroneMap](https://opendronemap.org) and come with installation support.

https://opendronemap.org/webodm/download/

:::note

The Windows installer currently comes packaged with WebODM version 2.8.1. To access the latest 3.x version, use Docker.

:::

### Docker

To install WebODM on your machine with docker, first install:

  - [Git](https://git-scm.com/downloads)
  - [Docker](https://www.docker.com/)

Windows users should install [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) and:

1. Make sure Linux containers are enabled (Switch to Linux Containers)
2. Give Docker enough CPUs (default 2) and RAM (>4Gb, 16Gb better but leave some for Windows) by going to `Settings -- Resources`
3. Select where on your hard drive you want virtual hard drives to reside (`Settings -- Resources -- Advanced`).
4. (optional) If you want to run the processing component (NodeODM) with GPU acceleration, install [WSL](https://learn.microsoft.com/windows/wsl/) and [set up GPU acceleration](https://learn.microsoft.com/windows/wsl/tutorials/gpu-compute). It's supported on Windows 11 or Windows 10, version 21H2 or higher. If you're just getting started, don't worry about this one.

Then:

* Open Git Bash (Windows), or from the command line (Mac / Linux / WSL), type:

```bash
git clone https://github.com/OpenDroneMap/WebODM --config core.autocrlf=input --depth 1
cd WebODM
./webodm.sh start
```

* If you face any issues at the last step on Linux, make sure your user is part of the docker group:

```bash
sudo usermod -aG docker $USER
exit
(restart shell by logging out and then back-in)
./webodm.sh start
```

🎉 Congratulations! You should be up and running. Open a browser to http://localhost:8000

To stop WebODM press CTRL+C or run:

```
./webodm.sh stop
```

To update WebODM to the latest version use:

```
./webodm.sh update
```


## Installation on other machines

### Google Compute, Amazon AWS

These steps are for Google Cloud, but can also be used for Amazon AWS, and other cloud platforms with small modifications:

1. Launch a Google Cloud instance of Ubuntu LTS.
2. Open the SSH terminal - Google offers SSH via the website.
3. Run `sudo apt-get update`
4. Run `sudo apt-get upgrade`
5. Install [docker-compose](https://docs.docker.com/compose/install/). Do not install via apt for 24.04 onward.
6. Run `sudo apt-get install python-pip`
7. Run `git clone https://github.com/OpenDroneMap/WebODM --config core.autocrlf=input --depth 1`
8. cd WebODM (Linux is case sensitive)
9. `sudo ./webodm.sh start`
10. You now can access WebODM via the public IP address for your Google instance. Remember the default port of 8000.
11. Check that your instance's firewall is allowing inbound TCP connections on port 8000! If you forget this step you will not be able to connect to WebODM.
12. Open http://publicip:8000

To setup the firewall on Google Cloud, open the instance, on the middle of the instance settings page find NIC0. Open it, and then add the TCP Port 8000 for ingress, and egress on the firewall.


### NAS (Qnap)

If you use [Lightning](https://webodm.net) or another processor node the requirements for WebODM are low enough for it to run on a fairly low power device such as a NAS. Testing has been done on a Qnap-TS264 with 32Gb of RAM (Celeron  N5095 processor)
To install WebODM on a Qnap NAS:

1. Enable ssh access to the NAS in control panel
2. Install git. This might be easily achieved using the [qgit qkpg](https://www.myqnap.org/product/qgit/)
3. Follow the “Installation with Docker” instructions above.
4. A new "webodm" application should appear in container station along with four individual containers for the app.
5. WebODM should be available at port 8000 of the NAS.
6. Setup a Lightning account online and configure it within "processing nodes". It's also possible to setup a more powerful computer to run processing tasks instead of Lightning.


## Advanced Setups

### Manage Processing Nodes

WebODM can be linked to one or more processing nodes that speak the [NodeODM API](https://github.com/OpenDroneMap/NodeODM/blob/master/docs/index.adoc), such as [NodeODM](https://github.com/OpenDroneMap/NodeODM), [NodeMICMAC](https://github.com/OpenDroneMap/NodeMICMAC/), [ClusterODM](https://github.com/OpenDroneMap/ClusterODM) and [Lightning](https://webodm.net). The default configuration includes a "node-odm-1" processing node which runs on the same machine as WebODM, just to help you get started. As you become more familiar with WebODM, you might want to install processing nodes on separate machines.

Adding more processing nodes will allow you to run multiple jobs in parallel.

You can also setup a [ClusterODM](https://github.com/OpenDroneMap/ClusterODM) node to run a single task across multiple machines with [distributed split-merge](https://docs.opendronemap.org/large/?highlight=distributed#getting-started-with-distributed-split-merge) and process dozen of thousands of images more quickly, with less memory.

If you don't need the default "node-odm-1" node, simply pass `--default-nodes 0` flag when starting WebODM:

`./webodm.sh restart --default-nodes 0`.

Then from the web interface simply manually remove the "node-odm-1" node.



### Enable SSL

WebODM has the ability to automatically request and install a SSL certificate via [Let’s Encrypt](https://letsencrypt.org/), or you can manually specify your own key/certificate pair.

 - Setup your DNS record (webodm.myorg.com --> IP of server).
 - Make sure port 80 and 443 are open.
 - Run the following:

```bash
./webodm.sh restart --ssl --hostname webodm.myorg.com
```

That's it! The certificate will automatically renew when needed.

If you want to specify your own key/certificate pair, simply pass the `--ssl-key` and `--ssl-cert` option to `./webodm.sh`. See `./webodm.sh --help` for more information.

Note! You cannot pass an IP address to the hostname parameter! You need a DNS record setup.

### Enable MicMac

WebODM can use [MicMac](https://github.com/OpenDroneMap/micmac) as a processing engine via [NodeMICMAC](https://github.com/OpenDroneMap/NodeMICMAC/). To add MicMac, simply run:

`./webodm.sh restart --with-micmac`

This will create a "node-micmac-1" processing node on the same machine running WebODM. Please note that NodeMICMAC is in active development and is currently experimental. If you find issues, please [report them](https://github.com/OpenDroneMap/NodeMICMAC/issues) on the NodeMICMAC repository.


### Enable IPv6

Your installation must first have a public IPv6 address.
To enable IPv6 on your installation, you need to activate IPv6 in Docker by adding the following to a file located at /etc/docker/daemon.json:
```bash
{
  "ipv6": true,
  "fixed-cidr-v6": "fdb4:4d19:7eb5::/64"
}
```
Restart Docker:
`systemctl restart docker`

To add IPv6, simply run:

`./webodm.sh restart --ipv6`

Note: When using `--ssl` mode, you cannot pass an IP address to the hostname parameter; you must set up a DNS AAAA record. Without `--ssl` mode enabled, access the site at (e.g., http://[2001:0db8:3c4d:0015::1]:8000). The brackets around the IPv6 address are essential!
You can add a new NodeODM node in WebODM by specifying an IPv6 address. Don't forget to include brackets around the address! e.g., [2001:0db8:fd8a:ae80::1]

## Common Troubleshooting

| Symptoms                                                                                                                        | Possible Solutions                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run out of memory                                                                                                               | Make sure that your Docker environment has enough RAM allocated: [MacOS Instructions](http://stackoverflow.com/a/39720010), [Windows Instructions](https://docs.docker.com/desktop/settings/windows/#advanced)                                                                                                                                            |
| On Windows, docker-compose fails with `Failed to execute the script docker-compose`                                             | Make sure you have enabled VT-x virtualization in the BIOS                                                                                                                                                                                                                                                                                                |
| Cannot access WebODM using Microsoft Edge on Windows 10                                                                         | Try to tweak your internet properties according to [these instructions](http://www.hanselman.com/blog/FixedMicrosoftEdgeCantSeeOrOpenVirtualBoxhostedLocalWebSites.aspx)                                                                                                                                                                                  |
| Getting a `No space left on device` error, but hard drive has enough space left                                                 | Docker on Windows by default will allocate only 20GB of space to the default docker-machine. You need to increase that amount. See [this link](http://support.divio.com/local-development/docker/managing-disk-space-in-your-docker-vm) and [this link](https://www.howtogeek.com/124622/how-to-enlarge-a-virtual-machines-disk-in-virtualbox-or-vmware/) |
| Cannot start WebODM via `./webodm.sh start`, error messages are different at each retry                                         | You could be running out of memory. Make sure you have enough RAM available. 2GB should be the recommended minimum, unless you know what you are doing                                                                                                                                                                                                    |
| On Windows, the storage space shown on the WebODM diagnostic page is not the same as what is actually set in Docker's settings. | From Hyper-V Manager, right-click "DockerDesktopVM", go to Edit Disk, then choose to expand the disk and match the maximum size to the settings specified in the docker settings. Upon making the changes, restart docker.                                                                                                                                |
| On Linux or WSL, Warning: `GPU use was requested, but no GPU has been found`                                                    | Run `nvidia-smi` (natively) or `docker run --rm --gpus all nvidia/cuda:11.2.2-devel-ubuntu20.04 nvidia-smi` (docker) to check with [NVIDIA driver](https://www.nvidia.com/drivers/unix/) and [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).                                     |