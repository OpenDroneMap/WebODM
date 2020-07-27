<h1 align="center">Cloud Import </h1>

Welcome to Cloud Import!

Cloud Import is a WebODM add-on that enables you to import your files from external sources. Instead of downloading the files to your computer and then upload them back to WebODM, you can simply import them to create a new task!

## Current Support

Currently, we support these kinds of sources:
#### Cloud Platforms
A **cloud platform** is an online platform that can store files, like [Dropbox](https://www.dropbox.com/ "Dropbox") or [Google Drive](https://www.google.com/drive/ "Google Drive"). Platforms have the concept of a folder or album, where files are stored. By entering the folder's URL, we will use each platform's API to retrieve all the images in those folders, and import them into WebODM.

Current platforms supported:
* [GitHub](https://github.com/ "GitHub")

#### Cloud Libraries
A **cloud library** is an extension of a cloud platform that has images organized in folders or albums. It differs from a cloud platform, in the way that it can also list all folders it contains, so that a user can choose to import a specific folder from a list, instead of a URL.

Cloud libraries can be used as cloud platforms, but if you happen to configure a server URL, then a list of all the folders in the server will be presented when trying to import to a new task.

Current platforms supported:
* [Piwigo](http://piwigo.com/ "Piwigo")

## Setup
Some of the platforms described above might need some configuration. For example, you might need to set a server URL or a authentication token.  When that is the case, you can go to the *"Cloud Import"* tab on the left menu, and do all the configuring you need.

## Contribute
If you would like to add support for new platforms, please don't hesitate to do so! Here are a few simple guidelines that might help you in your quest.

#### New Platforms
If you simply need to add a new platform, then add your new Python script to `WebODM/plugins/cloudimport/platforms`. You can copy an already existing platform file, or you can check the file `WebODM/plugins/cloudimport/cloud_platform.py` to see what you need to implement.

#### New Extensions
Now, if you want to add some more complex logic that requieres user configuration or something like that, you might need to write a **platform extension**. You will need to add your extension to `WebODM/plugins/cloudimport/extensions`. You can copy an already existing extension, or you can check the file `WebODM/plugins/cloudimport/platform_extension.py` to see what you need to implement.

#### Known Gaps
Now, there are a few known gaps to the system that you might encounter or that you might enjoy closing.
1. **Allow image resizing**:
	Currently, when importing a folder, image resizing is not allowed. This might be a problem for users without a lot of disk space, so it might make sense to fix this.
1. **Allow potential pagination when calling APIs**
	Currently, the workflow doesn't support calling APIs that requiere pagination.
1. **Make platform extensions have their own js, like WebODM plugins**
	Currently, when a platform extension requires their own Javascript code, you will need to add this code manually to the already existing code. It would be much easier if this was handed automatically, like the other parts of the add-on.
