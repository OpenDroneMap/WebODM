# For Developers

## Development Quickstart

1. Make a fork of the [WebODM repository](https://github.com/OpenDroneMap/WebODM/)
2. Clone your repository in a directory
3. Create a new branch: `git checkout -b branchname`.
4. [Setup a development environment](#setup-a-development-environment) either with [docker](#docker-setup) or [natively](#native-setup).
5. Commit the changes: `git commit -a -m "describe your changes"`
6. Push the changes to your repository: `git push origin branchname`
7. Create a [pull request](https://github.com/OpenDroneMap/WebODM/compare) 

We don't have many rules. Follow the guidelines indicated in the [Contributing](https://github.com/OpenDroneMap/WebODM/blob/master/CONTRIBUTING.md) document, be nice to others and you'll do great! :)

## Setup a Development Environment

There are two ways to setup a development environment. The easiest one is to use [docker](#docker-setup).

Once you have a development environment, read about the [project overview](#project-overview) and get hacking!

### Docker Setup

Follow the [Getting Started](https://github.com/OpenDroneMap/WebODM#getting-started) instructions, then run:

`./webodm.sh start --dev`

That's it! You can modify any of the files, including SASS and React.js files. Changes will be reflected in the running WebODM instance automatically. 

### Native Setup

If you can follow the instructions to [run WebODM natively](https://github.com/OpenDroneMap/WebODM#run-it-natively), you should be able to make changes to the code directly.

## Run Unit Tests

We think testing is a necessary part of delivering robust software. We try to achieve complete test coverage for backend code and at a minimum robust smoke testing for frontend code.

To run the unit tests, simply type:

`./webodm.sh test`

## Apply Changes In Production

Once you're done making changes, if you start WebODM in production mode (without the `--dev` flag), you will notice that your changes are missing. This is because `webodm.sh` uses the `opendronemap/webodm_webapp` docker image to launch WebODM, which doesn't have your changes. To apply the changes, you need to rebuild the docker image locally:

`docker build -t opendronemap/webodm_webapp .`

You can also modify the `docker-compose.yml` file to point to a different image.

## Project Overview

### Backend

The backend is based mainly on [Django](https://www.djangoproject.com/) and [Django REST Framework](http://www.django-rest-framework.org/).

We don't use much of Django's templating system, except for the `Administration` and `Processing Nodes` sections. Instead we use Django to expose an [API](#reference), which we then tie to a [React.js](https://facebook.github.io/react/) app.

Directories of interest are listed as follow:

Directory | Description
--------- | -----------
`/app`	  | Main application, includes the UI components, API, tests and backend logic.
`/nodeodm`| Application that bridges the communication between WebODM and [NodeODM](https://github.com/OpenDroneMap/NodeODM). Includes its own unit tests and models.
`/webodm` | Django's main project directory. Setting files are here.

### Frontend

We use a [React.js](https://facebook.github.io/react/) app ([ES6](https://leanpub.com/understandinges6/read/) syntax) and [SCSS](http://sass-lang.com/) for various UI components such as the dashboard. We use [webpack](https://webpack.github.io/) to build intermediate components into a static bundle.

Directories of interest are listed as follow:

Directory | Description
--------- | -----------
`/app/templates/app` | Location of Django templates. While we don't use them a lot, we use them for a few pages and as a glue to bootstrap the React code.
`/app/static/app/js` | Location of Javascript files for all UI components.
`/app/static/app/js/components` | We try to separate components for reusability into various React components. Each component is stored here.
`/app/static/app/js/css` | Each component should have its own SCSS file. Those files are stored here.

`/app/static/app/js/main.jsx` is the entry point for the UI. If you wonder how we tie Django and React.js together, this is the file to look at to begin your search.

### Documentation

We use [Slate](https://github.com/lord/slate) to generate our documentation. See their project's [wiki](https://github.com/lord/slate/wiki) for information about making changes to the documentation.

Documentation can be changed by modifying the files in `/slate/source/includes`.
