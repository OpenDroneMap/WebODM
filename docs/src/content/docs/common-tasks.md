---
title: Common Tasks
template: doc
---

It's fairly straightforward to manage an installation of WebODM. Here's a list of common operations you might need to do:

## Reset Admin Password

If you forgot the password you picked the first time you logged into WebODM, to reset it just type:

```bash
./webodm.sh start && ./webodm.sh resetadminpassword newpass
```

The password will be reset to `newpass`. The command will also tell you what username you chose.

## Backup and Restore

If you want to move WebODM to another system, you just need to transfer the docker volumes (unless you are storing your files on the file system).

On the old system:

```bash
mkdir -v backup
docker run --rm --volume webodm_dbdata:/temp --volume `pwd`/backup:/backup ubuntu tar cvf /backup/dbdata.tar /temp
docker run --rm --volume webodm_appmedia:/temp --volume `pwd`/backup:/backup ubuntu tar cvf /backup/appmedia.tar /temp
```

Your backup files will be stored in the newly created `backup` directory. Transfer the `backup` directory to the new system, then on the new system:

```bash
ls backup # --> appmedia.tar  dbdata.tar
./webodm.sh down # Make sure WebODM is down
docker run --rm --volume webodm_dbdata:/temp --volume `pwd`/backup:/backup ubuntu bash -c "rm -fr /temp/* && tar xvf /backup/dbdata.tar"
docker run --rm --volume webodm_appmedia:/temp --volume `pwd`/backup:/backup ubuntu bash -c "rm -fr /temp/* && tar xvf /backup/appmedia.tar"
./webodm.sh start
```

## Update

If you use docker, updating is as simple as running:

```bash
./webodm.sh update
```

## Customizing and Extending

Small customizations such as changing the application colors, name, logo, or adding custom CSS/HTML/Javascript can be performed directly from the Customize -- Brand/Theme panels within WebODM. No need to fork or change the code.

More advanced customizations can be achieved by [writing plugins](/plugin-development-guide/). This is the preferred way to add new functionality to WebODM since it requires less effort than maintaining a separate fork. The plugin system features server-side signals that can be used to be notified of various events, a ES6/React build system, a dynamic client-side API for adding elements to the UI, a built-in data store, an async task runner, hooks to add menu items and functions to rapidly inject CSS, Javascript and Django views.

To learn more, start from the [plugin development guide](https://docs.webodm.org/plugin-development-guide/). It's also helpful to study the source code of [existing plugins](https://github.com/OpenDroneMap/WebODM/tree/master/coreplugins).

If a particular hook / signal for your plugin does not yet exist, [request it](https://github.com/OpenDroneMap/WebODM/issues). We are adding hooks and signals as we go.
