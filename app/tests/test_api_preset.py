import logging

import json
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from app.models import Preset
from app.tests.classes import BootTestCase

logger = logging.getLogger('app.logger')

class TestApiPreset(BootTestCase):
    def setUp(self):
        super().setUp()

        superuser = User.objects.get(username='testsuperuser')

        Preset.objects.create(name='Global Preset #1', system=True, options=[{'test': True}])
        Preset.objects.create(name='Global Preset #2', system=True, options=[{'test2': True}])
        Preset.objects.create(owner=superuser, name='Local Preset #1', system=False, options=[{'test3': True}])

    def check_default_presets(self):
        self.assertTrue(Preset.objects.filter(name="Default", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="DSM + DTM", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="High Resolution", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="Forest", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="Buildings", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="3D Model", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="Point of Interest", system=True).exists())
        self.assertTrue(Preset.objects.filter(name="Multispectral", system=True).exists())

    def test_preset(self):
        client = APIClient()

        # Cannot list presets without authentication
        res = client.get("/api/presets/")
        self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN)

        # Cannot create presets without authentication
        res = client.post("/api/presets/", {
            'name': 'test',
        })
        self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN)

        user = User.objects.get(username="testuser")
        self.assertFalse(user.is_superuser)

        other_user = User.objects.get(username="testuser2")

        client.login(username="testuser", password="test1234")

        # Create local preset
        Preset.objects.create(owner=user, name='My Local Preset')

        # Can list presets
        res = client.get("/api/presets/")
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Only ours and global presets are available
        self.assertEqual(len(res.data), 16)
        self.assertTrue('My Local Preset' in [preset['name'] for preset in res.data])
        self.assertTrue('High Resolution' in [preset['name'] for preset in res.data])
        self.assertTrue('Global Preset #1' in [preset['name'] for preset in res.data])
        self.assertTrue('Global Preset #2' in [preset['name'] for preset in res.data])
        self.assertFalse('Local Preset #1' in [preset['name'] for preset in res.data])

        # Owner field does not exist
        self.assertFalse('owner' in res.data[0])

        # Can create preset when authenticated
        res = client.post("/api/presets/", {
            'name': 'test',
            'system': True
        })
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)

        # Result is not a system preset even though we tried to set it as such
        self.assertFalse(res.data['system'])

        # Cannot create a preset and set it as somebody else's preset
        res = client.post("/api/presets/", {
            'name': 'test',
            'owner': other_user.id
        })
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)

        preset = Preset.objects.get(pk=res.data['id'])

        # Still ours
        self.assertTrue(preset.owner == user)

        # Cannot update one of our existing preset with a different user, or set it to system
        res = client.patch("/api/presets/{}/".format(preset.id),{
            'owner': other_user.id,
            'system': True
        })
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        self.assertFalse(res.data['system'])
        preset.refresh_from_db()
        self.assertTrue(preset.owner == user)

        # Can update name and options fields
        res = client.patch("/api/presets/{}/".format(preset.id), {
            'name': 'changed',
            'options': json.dumps([{'name': 'optname', 'value': 'optvalue'}])
        })
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        self.assertTrue(res.data['name'] == 'changed')
        self.assertTrue('name' in res.data['options'][0])

        # Cannot set an invalid options value
        res = client.patch("/api/presets/{}/".format(preset.id), {
            'options': json.dumps([{'invalid': 'value'}])
        })
        self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Can delete our own preset
        res = client.delete("/api/presets/{}/".format(preset.id))
        self.assertTrue(res.status_code == status.HTTP_204_NO_CONTENT)
        self.assertFalse(Preset.objects.filter(pk=preset.id).exists())

        # Cannot delete somebody else's preset
        other_preset = Preset.objects.get(name="Local Preset #1")
        self.assertTrue(other_preset.owner != user)
        res = client.delete("/api/presets/{}/".format(other_preset.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot update somebody else's preset
        res = client.patch("/api/presets/{}/".format(other_preset.id), {
            'name': 'test'
        })
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot delete a system preset (even as a superuser)
        system_preset = Preset.objects.get(name="Global Preset #1")
        res = client.delete("/api/presets/{}/".format(system_preset.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        client.login(username="testsuperuser", password="test1234")
        res = client.delete("/api/presets/{}/".format(system_preset.id))
        self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN)



