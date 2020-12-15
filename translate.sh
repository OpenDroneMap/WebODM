#!/bin/bash

LOCALES="fr es it de tr"

if [[ "$1" == "extract" ]]; then
    echo "Extracting .po files from Django/React"
    locale_param=""
    for lang in $LOCALES
    do
        locale_param="--locale=$lang $locale_param"
    done
    
    mkdir -p locale
    django-admin makemessages --keep-pot $locale_param --ignore=build --ignore=app/templates/app/admin/* --ignore=app/templates/app/registration/*
    django-admin makemessages --keep-pot $locale_param -d djangojs --extension jsx --ignore=build
fi

if [[ "$1" == "build" ]]; then
    echo "Building .po files into .mo"
    django-admin compilemessages
fi
