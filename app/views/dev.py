from django.http import Http404
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import render

from django.contrib import messages
from django.utils.translation import ugettext as _
from django import forms
from webodm import settings
from django.http import JsonResponse
from django.utils.translation import get_language
import requests
import json, tempfile, os, logging, shutil, subprocess, zipfile, glob

logger = logging.getLogger('app.logger')

def download_file(url, destination):
    download_stream = requests.get(url, stream=True, timeout=90)

    with open(destination, 'wb') as fd:
        for chunk in download_stream.iter_content(4096):
            fd.write(chunk)

@user_passes_test(lambda u: u.is_superuser)
def dev_tools(request, action):
    if not settings.DEV:
        raise Http404()

    if request.method == 'POST':
        if action == "reloadTranslation":
            try:
                args = json.loads(request.body).get('args')

                fd, tmpzipPath = tempfile.mkstemp(suffix=".zip")
                os.close(fd)

                logger.info("Downloading %s" % args[0])
                download_file(args[0], tmpzipPath)

                tmpPath = tempfile.mkdtemp()

                logger.info("Extracting... %s" % tmpzipPath)
                with zipfile.ZipFile(tmpzipPath, 'r') as zip:
                    zip.extractall(path=tmpPath)
                os.unlink(tmpzipPath)
                                
                locale_path = glob.glob(os.path.join(tmpPath, "**", "locale"), recursive=True)
                if len(locale_path) != 1:
                    raise Exception(_("Cannot find locale/ folder in .zip archive"))
                
                locale_path = locale_path[0]
                logger.info("Found locale at %s" % locale_path)

                webodm_locale_dir = os.path.join(settings.BASE_DIR, "locale")

                logger.info("Removing %s" % webodm_locale_dir)
                shutil.rmtree(webodm_locale_dir)

                logger.info("Moving %s to %s..." % (locale_path, os.path.join(settings.BASE_DIR, "locale")))
                shutil.move(locale_path, settings.BASE_DIR)

                logger.info("Running translate.sh extract && translate.sh build safe")
                translate_script = os.path.join(settings.BASE_DIR, 'translate.sh')

                subprocess.call(['bash', '-c', '%s extract && %s build safe' % (translate_script, translate_script)], cwd=settings.BASE_DIR)
                
                return JsonResponse({'message': _("Translation files reloaded!"), 'reload': True})
            except Exception as e:
                return JsonResponse({'error': str(e)})
        else:
            return JsonResponse({'error': _("Invalid action")})
    else:
        return render(request, 'app/dev_tools.html', { 
                'title': _('Developer Tools'),
                'current_locale': get_language()
            })

