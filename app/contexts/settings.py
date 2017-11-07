from app.models import Setting

# Make the SETTINGS object available to all templates
def load(request):
    return {'SETTINGS': Setting.objects.first()}