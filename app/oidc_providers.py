from webodm import settings

def get_oidc_providers():
    providers = []
    for i, provider in enumerate(settings.OIDC_AUTH_PROVIDERS):
        if not isinstance(provider, dict):
            continue

        client_id = provider.get('client_id', '')
        client_secret = provider.get('client_secret', '')
        auth_endpoint = provider.get('auth_endpoint', '')
        token_endpoint = provider.get('token_endpoint', '')
        userinfo_endpoint = provider.get('userinfo_endpoint', '')
        name = provider.get('name', '')

        if not client_id or not client_secret or not auth_endpoint or not token_endpoint or not userinfo_endpoint or not name:
            continue

        providers.append({
            'client_id': client_id,
            'client_secret': client_secret,
            'auth_endpoint': auth_endpoint,
            'token_endpoint': token_endpoint,
            'userinfo_endpoint': userinfo_endpoint,
            'name': name,
            'icon': provider.get('icon') or 'fa fa-lock',
        })

    return providers