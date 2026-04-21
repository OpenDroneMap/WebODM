import logging
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
from django.db.utils import IntegrityError

from webodm import settings
from django.http import Http404
from django.db import transaction
from app.oidc_providers import get_oidc_providers


logger = logging.getLogger('app.logger')


def get_oidc_provider(provider_index):
    try:
        idx = int(provider_index)
    except (TypeError, ValueError):
        return None

    providers = get_oidc_providers()
    if idx < 0 or idx >= len(providers):
        return None
    return providers[idx]


def safe_next(request, next_url):
    if is_safe_url(url=next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return next_url
    return settings.LOGIN_REDIRECT_URL


def oidc_enabled():
    return len(get_oidc_providers()) > 0


def oidc_login(request, provider_index):
    if not oidc_enabled():
        raise Http404()

    provider = get_oidc_provider(provider_index)
    if not provider:
        messages.warning(request, _('Invalid SSO provider. Please try again.'))
        
        return redirect(settings.LOGIN_URL)

    next_url = safe_next(request, request.GET.get('next', settings.LOGIN_REDIRECT_URL))
    state = get_random_string(64)

    request.session['oidc_state'] = state
    request.session['oidc_next'] = next_url
    request.session['oidc_provider_index'] = provider_index

    callback_url = request.build_absolute_uri(reverse('oidc_callback'))
    params = {
        'response_type': 'code',
        'client_id': provider['client_id'],
        'redirect_uri': callback_url,
        'scope': 'openid email',
        'state': state,
    }

    return redirect('%s?%s' % (provider['auth_endpoint'], urlencode(params)))


def oidc_callback(request):
    if not oidc_enabled():
        raise Http404()

    session_provider_index = request.session.pop('oidc_provider_index', None)
    provider = get_oidc_provider(session_provider_index)
    if not provider:
        messages.warning(request, _('Invalid SSO provider. Please try again.'))
        return redirect(settings.LOGIN_URL)

    provider_error = request.GET.get('error')
    if provider_error:
        messages.warning(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    session_state = request.session.pop('oidc_state', None)
    callback_state = request.GET.get('state')
    if session_state is None or callback_state is None or session_state != callback_state:
        messages.warning(request, _('Invalid SSO state. Please try again.'))
        return redirect(settings.LOGIN_URL)

    code = request.GET.get('code')
    if not code:
        messages.warning(request, _('Missing SSO authorization code.'))
        return redirect(settings.LOGIN_URL)

    callback_url = request.build_absolute_uri(reverse('oidc_callback'))

    try:
        token_response = requests.post(
            provider['token_endpoint'],
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': callback_url,
                'client_id': provider['client_id'],
                'client_secret': provider['client_secret'],
            },
            headers={'Accept': 'application/json'},
            timeout=15,
            verify=True,
        )
        token_data = token_response.json()
    except Exception as e:
        logger.warning('OIDC token exchange failed: %s', str(e))
        messages.warning(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    access_token = token_data.get('access_token')
    if access_token is None:
        logger.warning('OIDC token response did not include access_token')
        messages.warning(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    try:
        userinfo = requests.get(
            provider['userinfo_endpoint'],
            headers={
                'Authorization': 'Bearer %s' % access_token,
                'Accept': 'application/json'
            },
            timeout=15,
            verify=True,
        )
        claims = userinfo.json()
    except Exception as e:
        logger.warning('OIDC userinfo request failed: %s', str(e))
        messages.warning(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    subject = claims.get('sub')
    email = claims.get('email', '').strip()
    if not subject or not email:
        logger.warning('OIDC claims missing required sub or email')
        messages.warning(request, _('SSO login failed.'))
        return redirect(settings.LOGIN_URL)

    try:
        user = User.objects.get(profile__oidc_sub=subject)
    except User.DoesNotExist:
        with transaction.atomic():
            try:
                user = User.objects.create_user(username=email)
                user.profile.oidc_sub = subject
                user.profile.save()
            except IntegrityError:
                messages.warning(request, _('Cannot create user. A username already exists with the same e-mail.'))
                return redirect(settings.LOGIN_URL)

    if not user.is_active:
        messages.warning(request, _('This account is disabled. Please contact an administrator.'))
        return redirect(settings.LOGIN_URL)

    login(request, user, backend='django.contrib.auth.backends.ModelBackend')

    next_url = request.session.pop('oidc_next', settings.LOGIN_REDIRECT_URL)
    return redirect(safe_next(request, next_url))