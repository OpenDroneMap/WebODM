from django import template
from app.plugins import get_active_plugins
import itertools

register = template.Library()

@register.simple_tag(takes_context=False)
def get_plugins_js_includes():
    # Flatten all urls for all plugins
    js_urls = list(itertools.chain(*[plugin.get_include_js_urls() for plugin in get_active_plugins()]))
    return "\n".join(map(lambda url: "<script src='{}'></script>".format(url), js_urls))