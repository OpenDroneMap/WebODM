for lang in it
do
	django-admin makemessages --keep-pot --locale=$lang --ignore=app/templates/app/admin/* --ignore=app/templates/app/registration/*
	django-admin makemessages --keep-pot --locale=$lang -d djangojs --extension jsx
done	
django-admin compilemessages
