import json

from django.dispatch import receiver
from django.http import HttpResponse
from guardian.shortcuts import get_objects_for_user, assign_perm
from rest_framework.renderers import JSONRenderer
from django.utils.translation import gettext as _

from app.plugins import GlobalDataStore, logger
from app.plugins import PluginBase, Menu, MountPoint, UserDataStore, signals
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST

from nodeodm.models import ProcessingNode
from app.api.processingnodes import ProcessingNodeSerializer

ds = GlobalDataStore('lightning')

def JsonResponse(dict):
    return HttpResponse(json.dumps(dict), content_type='application/json')

class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("Lightning Network"), self.public_url(""), "fa fa-bolt fa-fw")]

    def include_js_files(self):
        return ['add_cost_estimate.js']

    def build_jsx_components(self):
        return ['app.jsx', 'CostEstimateItem.jsx']

    def app_mount_points(self):
        @login_required
        def main(request):
            uds = UserDataStore('lightning', request.user)

            return render(request, self.template_path("index.html"), {
                'title': _('Lightning Network'),
                'api_key': uds.get_string("api_key")
            })

        @login_required
        @require_POST
        def save_api_key(request):
            api_key = request.POST.get('api_key')
            if api_key is None:
                return JsonResponse({'error': 'api_key is required'})

            uds = UserDataStore('lightning', request.user)
            uds.set_string('api_key', api_key)

            return JsonResponse({'success': True})

        @login_required
        @require_POST
        def sync_processing_node(request):
            hostname = request.POST.get('hostname')
            port = int(request.POST.get('port'))
            token = request.POST.get('token')

            if hostname is not None and port is not None and token is not None:
                nodes = get_objects_for_user(request.user, 'view_processingnode', ProcessingNode,
                                             accept_global_perms=False)
                matches = [n for n in nodes if n.hostname == hostname and n.port == port and n.token == token]
                if len(matches) == 0:
                    # Add
                    node = ProcessingNode.objects.create(hostname=hostname, port=port, token=token, label="Lightning")
                    assign_perm('view_processingnode', request.user, node)
                    assign_perm('change_processingnode', request.user, node)
                    assign_perm('delete_processingnode', request.user, node)

                    # Keep track of lightning node IDs
                    lightning_nodes = ds.get_json('nodes', [])
                    lightning_nodes.append(node.id)
                    ds.set_json('nodes', lightning_nodes)

                    return get_processing_nodes(request)
                else:
                    # Already added
                    return get_processing_nodes(request)
            else:
                return JsonResponse({'error': 'Invalid call (params missing)'})

        @login_required
        def get_processing_nodes(request):
            nodes = get_objects_for_user(request.user, 'view_processingnode', ProcessingNode,
                                         accept_global_perms=False)
            lightning_node_ids = ds.get_json("nodes", [])

            nodes = [n for n in nodes if n.id in lightning_node_ids]
            serializer = ProcessingNodeSerializer(nodes, many=True)

            return JsonResponse(serializer.data)

        @login_required
        def is_lightning_node(request):
            lightning_node_ids = ds.get_json("nodes", [])
            return JsonResponse({'result': int(request.GET.get('id')) in lightning_node_ids})


        return [
            MountPoint('$', main),
            MountPoint('save_api_key$', save_api_key),
            MountPoint('sync_processing_node$', sync_processing_node),
            MountPoint('get_processing_nodes$', get_processing_nodes),
            MountPoint('is_lightning_node$', is_lightning_node),
        ]


@receiver(signals.processing_node_removed, dispatch_uid="lightning_on_processing_node_removed")
def lightning_on_processing_node_removed(sender, processing_node_id, **kwargs):
    node_ids = ds.get_json('nodes', [])
    try:
        node_ids.remove(processing_node_id)
        logger.info("Removing lightning node {}".format(str(processing_node_id)))
        ds.set_json('nodes', node_ids)
    except ValueError:
        pass
