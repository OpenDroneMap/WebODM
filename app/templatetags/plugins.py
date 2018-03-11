from django import template
from app.plugins import get_active_plugins
import itertools

register = template.Library()

@register.simple_tag(takes_context=False)
def get_plugins_js_includes():
    # Flatten all urls for all plugins
    js_urls = list(itertools.chain(*[plugin.get_include_js_urls() for plugin in get_active_plugins()]))
    return "\n".join(map(lambda url: "<script src='{}'></script>".format(url), js_urls))

@register.simple_tag(takes_context=False)
def get_plugins_css_includes():
    # Flatten all urls for all plugins
    css_urls = list(itertools.chain(*[plugin.get_include_css_urls() for plugin in get_active_plugins()]))
    return "\n".join(map(lambda url: "<link href='{}' rel='stylesheet' type='text/css'>".format(url), css_urls))

@register.simple_tag()
def get_plugins_main_menus():
    # Flatten list of menus
    return list(itertools.chain(*[plugin.main_menu() for plugin in get_active_plugins()]))
