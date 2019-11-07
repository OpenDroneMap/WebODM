<p align="center">
  <img src="https://github.com/AnalyticalGraphicsInc/cesium/wiki/logos/Cesium_Logo_Color.jpg" width="50%" />
</p>

The Cesium Ion WebODM add-on enables you to publish and stream even the most massive of 3D Content on the web thanks to Cesium Ion.

With 3D Tiles, even multi-gigabyte models can be streamed to any device without having to download the entire model up front. By loading 3D Tiles into CesiumJS, you can fuse your model with other datasets, add geospatial context to place it at a real world location, or overlay additional details and analysis.

Learn more at https://cesium.com

## Setup

1. Grab a token with, `assets:list, assets:read, assets:write` permissions from [Cesium Ion](https://cesium.com/ion/tokens).

1. Under the Cesium Ion tab in WebODM set the token to the code generated in ion.

## Testing

1. WebODM provides open datasets which can be used as a testbench for the add-on. You will have to create an account in order to access the data. Download datasets [here](https://demo.webodm.org/dashboard/).

1. To use the dataset click on a **task**, then in the **download assets** dropdown, select all. This should download a zip on to your machine.

1. In your instance of WebODM, create a project, click import in the upper-right hand corner, and selet the zip we just downloaded from the demo.

1. After the import completes and a website reload all Cesium Ion functions should be available for testing.
