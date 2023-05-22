def load():
    from app.plugins.functions import get_current_plugin
    plugin = get_current_plugin(only_active=True)
    data_store = plugin.get_global_data_store()

    smtp_configuration = {
        'smtp_server': data_store.get_string('smtp_server', default=""),
        'smtp_port': data_store.get_int('smtp_port', default=587),
        'smtp_username': data_store.get_string('smtp_username', default=""),
        'smtp_password': data_store.get_string('smtp_password', default=""),
        'smtp_use_tls': data_store.get_bool('smtp_use_tls', default=False),
        'smtp_from_address': data_store.get_string('smtp_from_address', default=""),
        'smtp_to_address': data_store.get_string('smtp_to_address', default=""),
        'notification_app_name': data_store.get_string('notification_app_name', default=""),
        'notify_task_completed': data_store.get_bool('notify_task_completed', default=False),
        'notify_task_failed': data_store.get_bool('notify_task_failed', default=False),
        'notify_task_removed': data_store.get_bool('notify_task_removed', default=False)
    }
    return smtp_configuration


def save(data: dict):
    from app.plugins.functions import get_current_plugin
    plugin = get_current_plugin(only_active=True)
    data_store = plugin.get_global_data_store()

    data_store.set_string('smtp_server', data.get('smtp_server')),
    data_store.set_int('smtp_port', data.get('smtp_port')),
    data_store.set_string('smtp_username', data.get('smtp_username')),
    data_store.set_string('smtp_password', data.get('smtp_password')),
    data_store.set_bool('smtp_use_tls', data.get('smtp_use_tls')),
    data_store.set_string('smtp_from_address', data.get('smtp_from_address')),
    data_store.set_string('smtp_to_address', data.get('smtp_to_address')),
    data_store.set_string('notification_app_name',
                          data.get('notification_app_name')),
    data_store.set_bool('notify_task_completed',
                        data.get('notify_task_completed')),
    data_store.set_bool('notify_task_failed', data.get('notify_task_failed')),
    data_store.set_bool('notify_task_removed', data.get('notify_task_removed'))
