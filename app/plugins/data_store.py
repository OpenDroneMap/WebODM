from abc import ABC
from django.core.exceptions import MultipleObjectsReturned, ValidationError
from app.models import PluginDatum
import logging

logger = logging.getLogger('app.logger')

class DataStore(ABC):
    def __init__(self, namespace, user=None):
        """
        :param namespace: Namespace (typically the plugin's name) to use for this datastore
        :param user: User tied to this datastore. If None, this is a global data store
        """
        self.namespace = namespace
        self.user = user

    def db_key(self, key):
        return "{}::{}".format(self.namespace, key)

    def get_datum(self, key):
        return PluginDatum.objects.filter(key=self.db_key(key), user=self.user).first()

    def set_value(self, type, key, value):
        try:
            return PluginDatum.objects.update_or_create(key=self.db_key(key),
                                                         user=self.user,
                                                         defaults={type + '_value': value})
        except MultipleObjectsReturned:
            # This should never happen
            logger.warning("A plugin data store for the {} plugin returned multiple objects. This is potentially bad. The plugin developer needs to fix this! The data store will not be changed.".format(self.namespace))
            PluginDatum.objects.filter(key=self.db_key(key), user=self.user).delete()
        except ValidationError as e:
            raise InvalidDataStoreValue(e)

    def get_value(self, type, key, default=None):
        datum = self.get_datum(key)
        return default if datum is None else getattr(datum, type + '_value')

    def get_string(self, key, default=""):
        return self.get_value('string', key, default)

    def set_string(self, key, value):
        return self.set_value('string', key, value)

    def get_int(self, key, default=0):
        return self.get_value('int', key, default)

    def set_int(self, key, value):
        return self.set_value('int', key, value)

    def get_float(self, key, default=0.0):
        return self.get_value('float', key, default)

    def set_float(self, key, value):
        return self.set_value('float', key, value)

    def get_bool(self, key, default=False):
        return self.get_value('bool', key, default)

    def set_bool(self, key, value):
        return self.set_value('bool', key, value)

    def get_json(self, key, default={}):
        return self.get_value('json', key, default)

    def set_json(self, key, value):
        return self.set_value('json', key, value)

    def has_key(self, key):
        return self.get_datum(key) is not None

    def del_key(self, key):
        datum = self.get_datum(key)
        if datum is not None:
            datum.delete()
            return True
        else:
            return False


class UserDataStore(DataStore):
    def __init__(self, namespace, user):
        super().__init__(namespace, user)


class GlobalDataStore(DataStore):
    pass


class InvalidDataStoreValue(Exception):
    pass