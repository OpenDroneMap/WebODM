from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import post_save
from django.dispatch import receiver
from app.models import Task
from django.db.models import Sum
from django.core.cache import cache

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    quota = models.FloatField(default=-1, blank=True, help_text=_("Maximum disk quota in megabytes"), verbose_name=_("Quota"))

    def has_quota(self):
        return self.quota != -1

    def used_quota(self):
        return Task.objects.filter(project__owner=self.user).aggregate(total=Sum('size'))['total']

    def used_quota_cached(self):
        k = f'used_quota_{self.user.id}'
        cached = cache.get(k)
        if cached is not None:
            return cached
        
        v = self.used_quota()
        cache.set(k, v, 300) # 2 minutes
        return v
    
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()