from django.core.cache import cache
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models, transaction
from django.db.models import signals
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _


class Basemap(models.Model):
    CACHE_KEY = 'app_basemaps'
    CACHE_TTL = 60 * 60 * 24

    type = models.CharField(max_length=8, choices=[('tms', 'TMS'),('wms', 'WMS')], default='tms', verbose_name=_("Type"))
    url = models.CharField(max_length=1024, blank=False, null=False, verbose_name=_("URL"))
    label = models.CharField(max_length=255, blank=False, null=False, verbose_name=_("Label"))
    attribution = models.CharField(max_length=2048, blank=True, null=True, verbose_name=_("Attribution"))
    maxZoom = models.PositiveSmallIntegerField(default=20,
                                               validators=[MinValueValidator(0), MaxValueValidator(99)],
                                               verbose_name=_("Max zoom"))
    minZoom = models.PositiveSmallIntegerField(default=0,
                                               validators=[MinValueValidator(0), MaxValueValidator(99)],
                                               verbose_name=_("Min zoom"))
    subdomains = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Subdomains"))
    layers = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Layers"))
    styles = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Styles"))
    format = models.CharField(max_length=16, choices=[
        ('', ''),
        ('image/jpeg', 'JPEG'),
        ('image/png', 'PNG'),
    ], blank=True, default='', verbose_name=_("Format"))
    default = models.BooleanField(default=False, verbose_name=_("Default"))

    class Meta:
        verbose_name = _("Basemap")
        verbose_name_plural = _("Basemaps")
        ordering = ('-default', 'label')

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super(Basemap, self).save(*args, **kwargs)
            if self.default:
                Basemap.objects.exclude(pk=self.pk).filter(default=True).update(default=False)

    @classmethod
    def invalidate_cache(cls):
        cache.delete(cls.CACHE_KEY)

    @classmethod
    def get_cached_basemaps(cls):
        cached = cache.get(cls.CACHE_KEY)
        if cached is not None:
            return cached

        basemaps = []
        for bm in cls.objects.all().order_by('-default', 'id'):
            item = {
                'default': bm.default,
                'type': bm.type,
                'url': bm.url,
                'label': bm.label,
                'attribution': bm.attribution,
                'maxZoom': bm.maxZoom,
                'minZoom': bm.minZoom,
            }

            if bm.subdomains:
                item['subdomains'] = [s.strip() for s in bm.subdomains.split(',') if s.strip()]

            if bm.layers:
                item['layers'] = bm.layers

            if bm.format:
                item['format'] = bm.format

            basemaps.append(item)

        cache.set(cls.CACHE_KEY, basemaps, 60 * 60 * 24)
        return basemaps


@receiver(signals.post_save, sender=Basemap, dispatch_uid="basemap_post_save")
def basemap_post_save(sender, instance, created, **kwargs):
    Basemap.invalidate_cache()


@receiver(signals.post_delete, sender=Basemap, dispatch_uid="basemap_post_delete")
def basemap_post_delete(sender, instance, **kwargs):
    Basemap.invalidate_cache()
