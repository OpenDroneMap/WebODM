
from django.shortcuts import render

from app.plugins import logger

def LoadButtonsView(plugin):
    def view(request):

        return render(
            request,
            plugin.template_path("load_buttons.js"),
            {
                "api_url": "/api" + plugin.public_url("").rstrip("/"),
            },
            content_type="text/javascript",
        )

    return view
