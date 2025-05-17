import logging
import uuid
import shutil
import os

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.db.models import signals
from django.dispatch import receiver
from django.utils import timezone
from guardian.models import GroupObjectPermissionBase
from guardian.models import UserObjectPermissionBase
from guardian.shortcuts import get_perms_for_model, assign_perm
from django.utils.translation import gettext_lazy as _, gettext
from django.db import transaction

from app import pending_actions

from nodeodm import status_codes
from webodm import settings as wo_settings

logger = logging.getLogger('app.logger')


class Project(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, help_text=_("The person who created the project"), verbose_name=_("Owner"))
    name = models.CharField(max_length=255, help_text=_("A label used to describe the project"), verbose_name=_("Name"))
    description = models.TextField(default="", blank=True, help_text=_("More in-depth description of the project"), verbose_name=_("Description"))
    created_at = models.DateTimeField(default=timezone.now, help_text=_("Creation date"), verbose_name=_("Created at"))
    deleting = models.BooleanField(db_index=True, default=False, help_text=_("Whether this project has been marked for deletion. Projects that have running tasks need to wait for tasks to be properly cleaned up before they can be deleted."), verbose_name=_("Deleting"))
    tags = models.TextField(db_index=True, default="", blank=True, help_text=_("Project tags"), verbose_name=_("Tags"))
    public = models.BooleanField(default=False, help_text=_("A flag indicating whether this project is available to the public"), verbose_name=_("Public"))
    public_edit = models.BooleanField(default=False, help_text=_("A flag indicating whether this public project can be edited"), verbose_name=_("Public Edit"))
    public_id = models.UUIDField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Public identifier of the project"), verbose_name=_("Public Id"))
    

    def delete(self, *args):
        # No tasks?
        if self.task_set.count() == 0:
            # Just delete normally

            project_dir = self.get_project_dir()
            if os.path.isdir(project_dir):
                entries = os.listdir(project_dir)
                empty_project_folder = False

                if len(entries) == 0:
                    empty_project_folder = True
                elif len(entries) == 1 and entries[0] == "task":
                    empty_project_folder = len(os.listdir(os.path.join(project_dir, "task"))) == 0

                if empty_project_folder:
                    logger.info(f"Deleting {project_dir}")
                    try:
                        shutil.rmtree(project_dir)
                    except Exception as e:
                        logger.warning(f"Cannot delete {project_dir}: {str(e)}")
                else:
                    logger.warning(f"Project {self.id} is being deleted, but data is stored on disk. We will keep the data at {project_dir}, but will become orphaned")

            logger.info("Deleted project {}".format(self.id))

            super().delete(*args)
        else:
            # Need to remove all tasks before we can remove this project
            # which will be deleted by workers after pending actions
            # have been completed
            self.task_set.update(pending_action=pending_actions.REMOVE)
            self.deleting = True
            self.save()
            logger.info("Tasks pending, set project {} deleting flag".format(self.id))

    def __str__(self):
        return self.name

    def get_project_dir(self):
        if self.id is None:
            raise ValueError("Cannot call get_project_dir, id is None")
        
        return os.path.join(wo_settings.MEDIA_ROOT, "project", str(self.id))

    def tasks(self):
        return self.task_set.only('id')

    def tasks_count(self):
        return self.task_set.count()

    def get_map_items(self):
        return [task.get_map_items() for task in self.task_set.filter(
                    status=status_codes.COMPLETED
                ).filter(Q(orthophoto_extent__isnull=False) | Q(dsm_extent__isnull=False) | Q(dtm_extent__isnull=False))
                .only('id', 'project_id')
                .order_by('-created_at')]

    def get_public_info(self):
        return {
            'id': self.id,
            'public': self.public,
            'public_id': str(self.public_id) if self.public_id is not None else None,
            'public_edit': self.public_edit
        }

    def duplicate(self, new_owner=None):
        try:
            with transaction.atomic():
                project = Project.objects.get(pk=self.pk)
                project.pk = None
                project.name = gettext('Copy of %(task)s') % {'task': self.name}
                project.created_at = timezone.now()
                if new_owner is not None:
                    project.owner = new_owner
                project.public_id = None
                project.public_edit = False
                project.public = False
                project.save()
                project.refresh_from_db()

                for task in self.task_set.all():
                    new_task = task.duplicate(set_new_name=False)
                    if not new_task:
                        raise Exception("Failed to duplicate {}".format(new_task))
                    
                    # Move/Assign to new duplicate
                    new_task.project = project
                    new_task.save()
                    
            return project
        except Exception as e:
            logger.warning("Cannot duplicate project: {}".format(str(e)))
        
        return False

    def save(self, *args, **kwargs):
        # Assign a public ID if missing and public = True
        if self.public and self.public_id is None:
            self.public_id = uuid.uuid4()

        super(Project, self).save(*args, **kwargs)

    class Meta:
        verbose_name = _("Project")
        verbose_name_plural = _("Projects")

@receiver(signals.post_save, sender=Project, dispatch_uid="project_post_save")
def project_post_save(sender, instance, created, **kwargs):
    """
    Automatically assigns all permissions to the owner. If the owner changes
    it's up to the user/developer to remove the previous owner's permissions.
    """
    for perm in get_perms_for_model(sender).all():
        assign_perm(perm.codename, instance.owner, instance)


class ProjectUserObjectPermission(UserObjectPermissionBase):
    content_object = models.ForeignKey(Project, on_delete=models.CASCADE)


class ProjectGroupObjectPermission(GroupObjectPermissionBase):
    content_object = models.ForeignKey(Project, on_delete=models.CASCADE)
