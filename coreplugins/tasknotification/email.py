from django.core.mail import send_mail
from django.core.mail.backends.smtp import EmailBackend
from . import config
  

def send(subject : str, message : str, smtp_config : dict = None):

  if not smtp_config:
    smtp_config = config.load()

  email_backend = EmailBackend(
      smtp_config.get('smtp_server'), 
      smtp_config.get('smtp_port'), 
      smtp_config.get('smtp_username'), 
      smtp_config.get('smtp_password'),
      smtp_config.get('smtp_use_tls'),
      timeout=10
  )

  result = send_mail(
      subject,
      message,
      smtp_config.get('smtp_from_address'),
      [smtp_config.get('smtp_to_address')],
      connection=email_backend,
      auth_user = smtp_config.get('smtp_username'),
      auth_password = smtp_config.get('smtp_password'),
      fail_silently = False
  )