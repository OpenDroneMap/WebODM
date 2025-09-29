from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
import os
import logging
import json

logger = logging.getLogger(__name__)

def serve_react_app(request):
    """
    This function serves your React application
    Think of it as a waiter bringing your custom menu instead of the default menu
    """
    try:
        # Check if this is first access (no superusers exist)
        from django.contrib.auth.models import User
        from django.shortcuts import redirect
        
        if User.objects.filter(is_superuser=True).count() == 0:
            # First time setup needed - redirect to welcome page
            return redirect('welcome')
        
        # Find where your React app is built
        base_dir = os.path.dirname(os.path.dirname(__file__))  # Go up two folders
        index_path = os.path.join(base_dir, 'locane', 'dist', 'index.html')
        
        logger.info(f"Looking for React app at: {index_path}")
        
        # Check if the file exists
        if os.path.exists(index_path):
            # Read the React app's main file and send it to the user
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        else:
            # If React app isn't built, show an error message
            return HttpResponse(
                f"""
                <h1>React App Not Found</h1>
                <p>Looking for file at: {index_path}</p>
                <p>Please build your React app first by running:</p>
                <ol>
                    <li>cd locane</li>
                    <li>npm run build</li>
                </ol>
                """,
                content_type='text/html'
            )
    except Exception as e:
        # If anything goes wrong, show what happened
        return HttpResponse(
            f"<h1>Error serving React app</h1><p>{str(e)}</p>",
            content_type='text/html'
        )


@ensure_csrf_cookie
def api_login(request):
    """Session login endpoint with CSRF protection.
    GET: sets CSRF cookie (no body) -> { ok: true }
    POST: authenticate credentials (form or JSON) -> JSON response
    """
    if request.method == 'GET':
        return JsonResponse({'ok': True})

    if request.method != 'POST':
        return JsonResponse({'ok': False, 'error': 'method_not_allowed'}, status=405)

    return _handle_login_post(request)

@csrf_protect
def _handle_login_post(request):
    try:
        if request.content_type and 'application/json' in request.content_type:
            try:
                payload = json.loads(request.body.decode('utf-8') or '{}')
            except json.JSONDecodeError:
                return JsonResponse({'ok': False, 'error': 'invalid_json'}, status=400)
            username = payload.get('username')
            password = payload.get('password')
        else:
            username = request.POST.get('username')
            password = request.POST.get('password')

        if not username or not password:
            return JsonResponse({'ok': False, 'error': 'missing_credentials'}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is None:
            return JsonResponse({'ok': False, 'error': 'invalid_credentials'}, status=401)

        auth_login(request, user)
        return JsonResponse({'ok': True, 'username': user.username})
    except Exception as e:
        logger.exception('Login error')
        return JsonResponse({'ok': False, 'error': 'server_error', 'detail': str(e)}, status=500)


@csrf_protect
def api_logout(request):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'error': 'method_not_allowed'}, status=405)
    auth_logout(request)
    return JsonResponse({'ok': True})