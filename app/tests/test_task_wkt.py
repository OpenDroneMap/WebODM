import time
import json
import requests
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

import worker
from app.models import Project
from app.models import Task
from app.tests.classes import BootTransactionTestCase
from app.tests.utils import clear_test_media_root
from nodeodm import status_codes

class TestTaskWkt(BootTransactionTestCase):
    def setUp(self):
        super().setUp()
        clear_test_media_root()

    def test_task_wkt(self):
        client = APIClient()
        client.login(username="testuser", password="test1234")

        user = User.objects.get(username="testuser")
        project = Project.objects.create(
            owner=user,
            name="test project"
        )

        # Import with URL upload method
        res = client.post("/api/projects/{}/tasks/import".format(project.id), {
            'url': "https://github.com/OpenDroneMap/WebODM/releases/download/v3.0.1/brighton-proj-test.zip",
            'name': "test"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        url_import_task = Task.objects.get(id=res.data['id'])
       
        # Wait for completion
        c = 0
        while c < 10:
            worker.tasks.process_pending_tasks()
            url_import_task.refresh_from_db()
            if url_import_task.status == status_codes.COMPLETED:
                break
            c += 1
            time.sleep(1)

        self.assertEqual(url_import_task.import_url, "https://github.com/OpenDroneMap/WebODM/releases/download/v3.0.1/brighton-proj-test.zip")
        self.assertEqual(url_import_task.name, "test")

        # EPSG should be none, but WKT should be populated
        self.assertIsNone(url_import_task.epsg)
        self.assertEqual(url_import_task.wkt, 'PROJCS["unknown",GEOGCS["unknown",DATUM["Unknown based on GRS 1980 ellipsoid",SPHEROID["GRS 1980",6378137,298.257222101004,AUTHORITY["EPSG","7019"]]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",39.7552777777778],PARAMETER["central_meridian",-104.898055555556],PARAMETER["scale_factor",1.00025403],PARAMETER["false_easting",600000],PARAMETER["false_northing",400000],UNIT["US survey foot",0.304800609601219,AUTHORITY["EPSG","9003"]],AXIS["Easting",EAST],AXIS["Northing",NORTH]]')

        # Can access assets
        res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, url_import_task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Metadata checks for orthophoto
        res = client.get("/api/projects/{}/tasks/{}/orthophoto/metadata".format(project.id, url_import_task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        metadata = json.loads(res.content.decode("utf-8"))
        self.assertEqual(metadata['bounds']['crs'], url_import_task.wkt)
