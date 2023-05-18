import os
import configparser

script_dir = os.path.dirname(os.path.abspath(__file__))

def load():
  config = configparser.ConfigParser()
  config.read(f"{script_dir}/.conf")
  smtp_configuration = {
    'smtp_server': config.get('SETTINGS', 'smtp_server', fallback=""),
    'smtp_port': config.getint('SETTINGS', 'smtp_port', fallback=587),
    'smtp_username': config.get('SETTINGS', 'smtp_username', fallback=""),
    'smtp_password': config.get('SETTINGS', 'smtp_password', fallback=""),
    'smtp_use_tls': config.getboolean('SETTINGS', 'smtp_use_tls', fallback=False),
    'smtp_from_address': config.get('SETTINGS', 'smtp_from_address', fallback=""),
    'smtp_to_address': config.get('SETTINGS', 'smtp_to_address', fallback=""),
    'notification_app_name': config.get('SETTINGS', 'notification_app_name', fallback=""),
    'notify_task_completed': config.getboolean('SETTINGS', 'notify_task_completed', fallback=False),
    'notify_task_failed': config.getboolean('SETTINGS', 'notify_task_failed', fallback=False),
    'notify_task_removed': config.getboolean('SETTINGS', 'notify_task_removed', fallback=False)
  }
  return smtp_configuration

def save(data : dict):
  config = configparser.ConfigParser()
  config['SETTINGS'] = {
      'smtp_server': str(data.get('smtp_server')),
      'smtp_port': str(data.get('smtp_port')),
      'smtp_username': str(data.get('smtp_username')),
      'smtp_password': str(data.get('smtp_password')),
      'smtp_use_tls': str(data.get('smtp_use_tls')),
      'smtp_from_address': str(data.get('smtp_from_address')),
      'smtp_to_address': str(data.get('smtp_to_address')),
      'notification_app_name': str(data.get('notification_app_name')),
      'notify_task_completed': str(data.get('notify_task_completed')),
      'notify_task_failed': str(data.get('notify_task_failed')),
      'notify_task_removed': str(data.get('notify_task_removed'))
  }
  with open(f"{script_dir}/.conf", 'w') as configFile:
      config.write(configFile)