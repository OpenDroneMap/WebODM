# Arg order is very important for task deconstruction.
# If order is changed make sure that the refresh API call is updated

def upload_to_ion(
    task_id,
    asset_type,
    token,
    asset_path,
    name,
    description="",
    attribution="",
    options={},
):
    import sys
    import time
    import logging
    import requests
    from os import path
    from shutil import rmtree
    from enum import Enum
    from app.plugins import logger
    from plugins.cesiumion.api_views import (
        get_asset_info,
        set_asset_info,
        AssetType,
        ASSET_TO_OUTPUT,
        ASSET_TO_SOURCE,
        ASSET_TO_FILE,
        pluck,
        )
    from plugins.cesiumion.model_tools import (
        to_ion_texture_model, 
        IonInvalidZip,
        )
    from plugins.cesiumion.globals import ION_API_URL
    class LoggerAdapter(logging.LoggerAdapter):
        def __init__(self, prefix, logger):
            super().__init__(logger, {})
            self.prefix = prefix

        def process(self, msg, kwargs):
            return "[%s] %s" % (self.prefix, msg), kwargs

    class TaskUploadProgress(object):
        def __init__(self, file_path, task_id, asset_type, logger=None, log_step_size=0.05):
            self._task_id = task_id
            self._asset_type = asset_type
            self._logger = logger

            self._uploaded_bytes = 0
            self._total_bytes = float(path.getsize(file_path))
            self._asset_info = get_asset_info(task_id, asset_type)

            self._last_log = 0
            self._log_step_size = log_step_size

        @property
        def asset_info(self):
            return self._asset_info

        def __call__(self, total_bytes):
            self._uploaded_bytes += total_bytes
            progress = self._uploaded_bytes / self._total_bytes
            if progress == 1:
                progress = 1

            self._asset_info["upload"]["progress"] = progress
            if self._logger is not None and progress - self._last_log > self._log_step_size:
                self._logger.info(f"Upload progress: {progress * 100}%")
                self._last_log = progress

            set_asset_info(self._task_id, self._asset_type, self._asset_info)

    asset_logger = LoggerAdapter(prefix=f"Task {task_id} {asset_type}", logger=logger)
    asset_type = AssetType[asset_type]
    asset_info = get_asset_info(task_id, asset_type)
    del_directory = None

    try:
        import boto3
    except ImportError:
        import subprocess

        asset_logger.info(f"Manually installing boto3...")
        subprocess.call([sys.executable, "-m", "pip", "install", "boto3"])
        import boto3

    try:
        # Update asset_path based off
        if asset_type == AssetType.TEXTURED_MODEL:
            try:
                asset_path, del_directory = to_ion_texture_model(asset_path)
                logger.info("Created ion texture model!")
            except IonInvalidZip as e:
                logger.info("Non geo-referenced texture model, using default file.")
            except Exception as e:
                logger.warning("Failed to convert to ion texture model")
                logger.warning(e)

        headers = {"Authorization": f"Bearer {token}"}
        data = {
            "name": name,
            "description": description,
            "attribution": attribution,
            "type": ASSET_TO_OUTPUT[asset_type],
            "options": {**options, "sourceType": ASSET_TO_SOURCE[asset_type]},
        }

        # Create Asset Request
        asset_logger.info(f"Creating asset of type {asset_type}")
        res = requests.post(f"{ION_API_URL}/assets", json=data, headers=headers)
        res.raise_for_status()
        ion_info, upload_meta, on_complete = pluck(
            res.json(), "assetMetadata", "uploadLocation", "onComplete"
        )
        ion_id = ion_info["id"]
        access_key, secret_key, token, endpoint, bucket, file_prefix = pluck(
            upload_meta,
            "accessKey",
            "secretAccessKey",
            "sessionToken",
            "endpoint",
            "bucket",
            "prefix",
        )

        # Upload
        asset_logger.info("Starting upload")
        uploat_stats = TaskUploadProgress(asset_path, task_id, asset_type, asset_logger)
        key = path.join(file_prefix, ASSET_TO_FILE[asset_type])
        boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=token,
        ).upload_file(asset_path, Bucket=bucket, Key=key, Callback=uploat_stats)
        asset_info = uploat_stats.asset_info
        asset_info["id"] = ion_id
        asset_info["upload"]["active"] = False
        asset_info["process"]["active"] = True
        set_asset_info(task_id, asset_type, asset_info)

        # On Complete Handler
        asset_logger.info("Upload complete")
        method, url, fields = pluck(on_complete, "method", "url", "fields")
        res = requests.request(method, url=url, headers=headers, data=fields)
        res.raise_for_status()

        # Processing Status Refresh
        asset_logger.info("Starting processing")
        refresh = True
        while refresh:
            res = requests.get(f"{ION_API_URL}/assets/{ion_id}", headers=headers)
            res.raise_for_status()

            state, percent_complete = pluck(res.json(), "status", "percentComplete")
            progress = float(percent_complete) / 100
            if "ERROR" in state.upper():
                asset_info["error"] = f"Processing failed"
                asset_logger.info("Processing failed...")
                refresh = False
            if progress >= 1:
                refresh = False

            if asset_info["process"]["progress"] != progress:
                asset_info["process"]["progress"] = progress
                asset_logger.info(f"Processing {percent_complete}% - {state}")
                set_asset_info(task_id, asset_type, asset_info)
            time.sleep(2)

        asset_logger.info("Processing complete")
        asset_info["process"]["progress"] = 1
        asset_info["process"]["active"] = False
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            asset_info["error"] = "Invalid ion token!"
        elif e.response.status_code == 404:
            asset_info["error"] = "Missing permisssions on ion token!"
        else:
            asset_info["error"] = str(e)
        asset_logger.error(e)
    except Exception as e:
        asset_info["error"] = str(e)
        asset_logger.error(e)

    if del_directory != None:
        rmtree(del_directory)

    set_asset_info(task_id, asset_type, asset_info)