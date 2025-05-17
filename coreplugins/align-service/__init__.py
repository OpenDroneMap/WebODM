# Import needed for signal registration - don't remove
from . import signals  # noqa: F401
from .plugin import Plugin, ConfigurationForm, save, config
__all__ = ["Plugin", "ConfigurationForm", "save", "config"]
