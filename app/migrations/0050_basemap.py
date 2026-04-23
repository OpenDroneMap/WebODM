from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0049_profile_oidc_sub'),
    ]

    operations = [
        migrations.CreateModel(
            name='Basemap',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('tms', 'TMS'), ('wms', 'WMS')], default='tms', max_length=8, verbose_name='Type')),
                ('url', models.CharField(max_length=1024, verbose_name='URL')),
                ('label', models.CharField(max_length=255, unique=True, verbose_name='Label')),
                ('attribution', models.CharField(blank=True, max_length=2048, null=True, verbose_name='Attribution')),
                ('maxzoom', models.PositiveSmallIntegerField(default=20, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(99)], verbose_name='Max zoom')),
                ('minzoom', models.PositiveSmallIntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(99)], verbose_name='Min zoom')),
                ('subdomains', models.CharField(blank=True, max_length=255, null=True, verbose_name='Subdomains')),
                ('layers', models.CharField(blank=True, max_length=255, null=True, verbose_name='Layers')),
                ('styles', models.CharField(blank=True, max_length=255, null=True, verbose_name='Styles')),
                ('format', models.CharField(blank=True, choices=[('', ''), ('image/jpeg', 'JPEG'), ('image/png', 'PNG')], default='', max_length=16, verbose_name='Format')),
                ('default', models.BooleanField(default=False, verbose_name='Default')),
            ],
            options={
                'verbose_name': 'Basemap',
                'verbose_name_plural': 'Basemaps',
                'ordering': ('-default', 'label'),
            },
        ),
    ]
