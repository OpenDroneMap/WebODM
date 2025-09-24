"""
URL Configuration - This tells Django what to show for different web addresses
"""
from django.conf.urls import url, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.views.i18n import JavaScriptCatalog
from .views import serve_react_app, api_login, api_logout

urlpatterns = [
    # Admin panel - keep the original WebODM admin working
    url(r'^admin/', admin.site.urls),
    
    # API endpoints (mount only the pure API urlconf, not legacy HTML views)
    url(r'^api/', include('app.api.urls')),

    # Essential i18n routes that templates expect
    url(r'^jsi18n/', JavaScriptCatalog.as_view(packages=['app']), name='javascript-catalog'),
    url(r'^i18n/', include('django.conf.urls.i18n')),

    # Auth JSON endpoints for new React frontend
    url(r'^login/?$', api_login, name='api_login'),
    url(r'^logout/?$', api_logout, name='api_logout'),
    
    # React single-page app mounts only at root. If client-side routing is
    # introduced later, reintroduce a fallback pattern before adding new
    # backend endpoints that might be shadowed.
    url(r'^$', serve_react_app, name='react_app'),
]

# Serve static files (CSS, JS, images) in development
if settings.DEBUG:
    from django.contrib.staticfiles import views as staticfiles_views
    from django.urls import re_path
    # Use Django's staticfiles app for automatic serving from STATICFILES_DIRS
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', staticfiles_views.serve),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)