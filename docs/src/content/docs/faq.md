---
title: Frequently Asked Questions
template: doc
---

## Where Are My Files Stored?

When using Docker, all processing results are stored in a docker volume and are not available on the host filesystem. There are two specific docker volumes of interest:
1. Media (called webodm_appmedia): This is where all files related to a project and task are stored.
2. Postgres DB (called webodm_dbdata): This is what Postgres database uses to store its data.

For more information on how these two volumes are used and in which containers, please refer to the [docker-compose.yml](docker-compose.yml) file.

For various reasons such as ease of backup/restore, if you want to store your files on the host filesystem instead of a docker volume, you need to pass a path via the `--media-dir` and/or the `--db-dir` options:

```bash
./webodm.sh restart --media-dir /home/user/webodm_data --db-dir /home/user/webodm_db
```

Note that existing task results will not be available after the change. Refer to the [Migrate Data Volumes](https://docs.docker.com/engine/tutorials/dockervolumes/#backup-restore-or-migrate-data-volumes) section of the Docker documentation for information on migrating existing task results.