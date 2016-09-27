#!/bin/bash
if ! [ -a .initialized ]; then
    echo First run, migrating...
    python manage.py makemigrations
    python manage.py migrate

    echo Creating default superuser...
    echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin')" | python manage.py shell
    touch .initialized
fi

python manage.py runserver 0.0.0.0:8000