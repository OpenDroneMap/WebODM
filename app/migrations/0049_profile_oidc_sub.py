from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0048_task_media'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='oidc_sub',
            field=models.CharField(blank=True, help_text='OIDC Subject used for SSO', max_length=255, null=True, unique=True, verbose_name='OIDC Subject'),
        ),
    ]
