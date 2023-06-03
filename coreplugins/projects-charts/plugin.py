from datetime import datetime

from django import forms
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.shortcuts import render
from django.utils.translation import gettext as _

from app.models import Project, Task
from app.plugins import PluginBase, Menu, MountPoint


def get_first_year():
    project = Project.objects.order_by('created_at').first()
    if project:
        return project.created_at.year
    else:
        return datetime.now().year


def get_last_year():
    project = Project.objects.order_by('created_at').last()
    if project:
        return project.created_at.year
    else:
        return datetime.now().year


year_choices = [(r, r) for r in
                range(get_first_year(), get_last_year() + 1)]


class ProjectForm(forms.Form):
    year = forms.IntegerField(label='Year',
                              widget=forms.Select(choices=year_choices, attrs={'class': 'form-control'},
                                                  ))


def get_projects_by_month(year=datetime.now().year):
    return Project.objects.filter(created_at__year=year).annotate(
        month=TruncMonth('created_at')).values('month').annotate(
        c=Count('id')).values_list('month', 'c').order_by('month')


def get_tasks_by_month(year):
    return Task.objects.filter(created_at__year=year).annotate(
        month=TruncMonth('created_at')).values('month').annotate(
        c=Count('id')).values_list('month', 'c').order_by('month')


class Plugin(PluginBase):

    def main_menu(self):
        return [Menu(_("Charts"), self.public_url(""), "fa fa-chart-bar")]

    def include_js_files(self):
        return ['Chart.min.js']

    def app_mount_points(self):
        @login_required
        def index(request):
            list_count_projects_by_month = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            list_count_tasks_by_month = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            year = datetime.now().year
            form = ProjectForm(request.GET)

            if request.method == "GET":
                if form.is_valid():
                    date = request.GET.get('year')
                    year = date.split('-')[0]
            else:
                form = ProjectForm(initial={'year': year})

            for i in get_projects_by_month(year):
                list_count_projects_by_month.insert(i[0].month - 1, i[1])

            for i in get_tasks_by_month(year):
                list_count_tasks_by_month.insert(i[0].month - 1, i[1])

            template_args = {
                'form': form,
                'projects_by_month': list_count_projects_by_month,
                'tasks_by_month': list_count_tasks_by_month,
                'title': 'Charts',
                'months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
                           'October', 'November', 'December']
            }
            return render(request, self.template_path("index.html"), template_args)

        return [
            MountPoint('$', index)
        ]
