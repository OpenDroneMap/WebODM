# Import needed for signal registration - don't remove
from . import signals  # noqa: F401
from .plugin import Plugin
__all__ = ["Plugin"]
