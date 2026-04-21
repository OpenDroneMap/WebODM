import logging
import hashlib
from urllib.parse import urlencode

import requests
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.crypto import get_random_string
from django.utils.http import is_safe_url
from django.utils.translation import ugettext as _

from webodm import settings


logger = logging.getLogger('app.logger')


def safe_next(request, next_url):
    if is_safe_url(url=next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return next_url
    return settings.LOGIN_REDIRECT_URL

def oidc_login(request):
    if not settings.OIDC_CLIENT_ID:
        return redirect(settings.LOGIN_URL)

    next_url = safe_next(request, request.GET.get('next', settings.LOGIN_REDIRECT_URL))
    state = get_random_string(64)

    request.session['oidc_state'] = state
    request.session['oidc_next'] = next_url

    callback_url = request.build_absolute_uri(reverse('oidc_callback'))
    params = {
        'response_type': 'code',
        'client_id': settings.OIDC_CLIENT_ID,
        'redirect_uri': callback_url,
        'scope': 'openid email',
        'state': state,
    }

    return redirect('%s?%s' % (settings.OIDC_AUTHORIZATION_ENDPOINT, urlencode(params)))


def oidc_callback(request):
    if not settings.OIDC_CLIENT_ID:
        return redirect(settings.LOGIN_URL)

    provider_error = request.GET.get('error')
    if provider_error:
        messages.error(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    session_state = request.session.pop('oidc_state', None)
    callback_state = request.GET.get('state')
    if session_state is None or callback_state is None or session_state != callback_state:
        messages.error(request, _('Invalid SSO state. Please try again.'))
        return redirect(settings.LOGIN_URL)

    code = request.GET.get('code')
    if not code:
        messages.error(request, _('Missing SSO authorization code.'))
        return redirect(settings.LOGIN_URL)

    callback_url = request.build_absolute_uri(reverse('oidc_callback'))

    try:
        token_response = requests.post(
            settings.OIDC_TOKEN_ENDPOINT,
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': callback_url,
                'client_id': settings.OIDC_CLIENT_ID,
                'client_secret': settings.OIDC_CLIENT_SECRET,
            },
            headers={'Accept': 'application/json'},
            timeout=15,
            verify=True,
        )
        token_data = token_response.json()
    except Exception as e:
        logger.warning('OIDC token exchange failed: %s', str(e))
        messages.error(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    access_token = token_data.get('access_token')
    if access_token is None:
        logger.warning('OIDC token response did not include access_token')
        messages.error(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    try:
        userinfo_response = requests.get(
            settings.OIDC_USERINFO_ENDPOINT,
            headers={
                'Authorization': 'Bearer %s' % access_token,
                'Accept': 'application/json'
            },
            timeout=15,
            verify=True,
        )
        claims = userinfo_response.json()
    except Exception as e:
        logger.warning('OIDC userinfo request failed: %s', str(e))
        messages.error(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    subject = claims.get('sub')
    email = claims.get('email', '').strip()
    if not subject or not email:
        logger.warning('OIDC claims missing required sub or email')
        messages.error(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    try:
        user = User.objects.get(profile__oidc_sub=subject)
    except User.DoesNotExist:
        user = User.objects.create_user(username=email)
        user.profile.oidc_sub = subject
        user.profile.save()

    login(request, user, backend='django.contrib.auth.backends.ModelBackend')

    next_url = request.session.pop('oidc_next', settings.LOGIN_REDIRECT_URL)
    return redirect(safe_next(request, next_url))