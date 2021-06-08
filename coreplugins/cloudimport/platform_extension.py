from abc import ABC, abstractmethod
from app.plugins import get_current_plugin
from coreplugins.cloudimport.cloud_platform import CloudPlatform

class PlatformExtension(CloudPlatform):
    """A platform extension is a platform with extra capacities. It may require extra configuration, or it might provide new features."""

    def __init__(self, name, folder_url_example):
         super().__init__(name, folder_url_example)
    
    def get_form_fields(self):
        """Return a list of Field instances so that configuration can be set"""
        return []
    
    def get_api_views(self):
        """Return a lists of APIViews to mount"""
        return []  
        

class FormField(ABC):
    def __init__(self, key, platform_name, default_value):
        self.key = key
        self.field_id = "{}_{}".format(platform_name, key)
        self.default_value = default_value
        
    @abstractmethod
    def get_django_field(self, user_data_store):
        """Return a django field"""
    
    @abstractmethod    
    def get_stored_value(self, user_data_store):    
        """Retrieve the value from the data store"""
    
    @abstractmethod    
    def save_value(self, user_data_store, form):    
        """Save the value in the form to the data store"""

class StringField(FormField):
    def __init__(self, key, platform_name, default_value):
         super().__init__(key, platform_name, default_value)
    
    def get_stored_value(self, user_data_store):
        return user_data_store.get_string(self.field_id, default=self.default_value)
    
    def save_value(self, user_data_store, form):
        value = form.cleaned_data[self.field_id]
        user_data_store.set_string(self.field_id, value)    