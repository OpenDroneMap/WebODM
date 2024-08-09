<p align="center">
  <img src="https://github.com/AnalyticalGraphicsInc/Cesium/wiki/logos/Cesium_Logo_Color.jpg" width="50%" />
</p>

# Cesium Ion WebODM Plugin

## 1. Introduction

### Overview
The Cesium Ion WebODM plugin enables seamless integratIon to upload processed WebODM tasks to your Cesium Ion account.
Using the Cesium Ion ecosystem, multi-gigabit models can be streamed to any device using Cesium clients to load 3D tiles.

Learn more at https://Cesium.com

### Prerequisites
> - WebODM versIon 2.5.0 or later
> - [Cesium Ion](https://Cesium.com/ion/tokens) token with `assets:list, assets:read, assets:write` permissions 
> - Internet connection

## 2. Initial Setup

### Enabling Plugin
1. Go to "AdministratIon -> Plugins" and enable Cesium ion.
2. Select the left Cesium Ion tab 
3. Copy and paste your Cesium Ion token then `Set Token`.

## 3. Usage

### Basic Usage

Example:
1. Create a new project in the WebODM dashboard.
2. Upload your images.
3. Edit the WebODM task options and make sure to enable `texturing-single-material`.
4. Start the WebODM processing (this will take a while to complete).
3. Once finished, select the `Tile in CesiumIon` dropdown button for a list of available asset uploads.
4. Click on a dropdown item to show the popup dialogue where you can rename the asset, add a description/attribute, or enable an Cesium Ion option before uploading.
5. Submit to start the upload to your Cesium Ion assets account.
6. You can view the progress of the upload by clicking the `View Ion Tasks` button. 
7. Once complete you can then click on the `View in Cesium` dropdown button to open a new browser tab to view your Cesium Ion assets 

> **NOTE:** There are 2 phases to a Cesium task: **uploading** and **processing**. Uploading is the transfer of processed WebODM data to Cesium Ion. Processing is the tiling/rendering Cesium Ion does to generate streamable models.

## 4. New Feature: CesiumIon Plugin v1.3.0

### KVX 2.0
Cesium Ion upgraded their streaming pipeline to automatically use their `1.1` tileset version. The new standardize tileset version comes with [`KTX2`](https://www.khronos.org/ktx/), a texture format compression option to create a smaller tilset for better streaming performance. 

## 5. Troubleshooting

### Common Issues

> - **Issue:** texture model uploads to cesium ion but fails to process/render it.
> - **Solution:** Ensure that you have enabled `texturing-single-material` before WebODM processing on a *new* project task as WebODM stores previously processed textured models in the same odm_textured data folder. (Cesium Ion only accepts single textured materials for a 3D_CAPTURE)

## 6. FAQ

### Frequently Asked Questions

> - **Q:** Can I use the plugin with older versions of WebODM?
> - **A:** No, the updated plugin is compatible only with WebODM versIon 2.5.0 or later.
