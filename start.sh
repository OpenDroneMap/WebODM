#!/bin/bash
echo Running migrations
python manage.py makemigrations
python manage.py migrate

echo Creating default superuser...

# This will fail if the user is a duplicate
echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin')" | python manage.py shell

python manage.py runserver 0.0.0.0:8000