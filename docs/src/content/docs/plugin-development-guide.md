---
title: Plugin Development Guide
template: doc
---

WebODM lets you write plugins, which you can distribute as .zip packages or share them with the world by adding them to the `coreplugins` folder of WebODM (and opening a pull request). This is a flexible option for those that don't want to maintain a separate fork, yet want to add new functionalities to WebODM.

You can turn on/off plugins from the Dashboard via the **Administration** --> **Plugins** menu.

Plugins let you define both server-side (Python) and client-side logic (Javascript). They execute in a shared environment. There are hooks / event handlers that you can subscribe to be notified of things, for example when a task is created/deleted, or when the map view is about to be rendered. There's a limited number of hooks, but keep in mind that more can be added.

Some basic helpers are provided, for example for running asynchronous tasks (think long running), for doing basic key-value data storage, for installing isolated Python dependencies (via pip) as well as Javascript dependencies (via npm). A client side build system (via webpack) also lets you use React/SCSS in your plugin code and access all of WebODM's client side components (JSX).

You can make assets available (images, styles, templates, ...) simply by placing them in a `public` folder.

The plugin system doesn't try to impose strict standards. What you build is up to you and anything is possible.

## Quickstart

 * Make sure you have launched WebODM in development mode (via `--dev`). See [contributing](/contributing/#setup-a-development-environment) for instructions.
 * Go to **Administration** --> **Plugins** and activate the **Hello World** plugin.
 * Notice that a "Hello World" menu has appeared on the left-side menu.
 * Make a copy of the `coreplugins/hello-world` folder. Call it `coreplugins/my-plugin`.
 * Edit `coreplugins/my-plugin/manifest.json`:

 ```json
 {
	"name": "My Plugin",
	"webodmMinVersion": "2.9.4",
	"description": "My First plugin",
	"version": "1.0.0",
	"author": "Your name",
	"email": "your@email.here",
	"repository": "https://github.com/OpenDroneMap/WebODM",
	"tags": ["descriptive", "tags"],
	"homepage": "https://github.com/OpenDroneMap/WebODM",
	"experimental": false,
	"deprecated": false
}
```

 * Edit `coreplugins/my-plugin/plugin.py`:

```python
from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext as _

class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("My Plugin"), self.public_url(""), "fa fa-cog fa-fw")]

    def app_mount_points(self):
        @login_required
        def hello_view(request):
            return render(request, self.template_path("hello.html"), {'message': "Hello!"})

        return [
            MountPoint('$', hello_view),
            # more mount points here ...
        ]
    
    def include_js_files(self):
        return ['main.js']
    
    def build_jsx_components(self):
        return ['app.jsx']

    # see also plugin_base.py for more methods
 ```

 * Save the changes and open `app/boot.py`, add an empty line, save the `boot.py`, then remove the empty line, then save `boot.py` again. This is a trick to force WebODM to reload without restarting the docker process. You only need to do this once.
 * Your plugin should be now visible under **Administration** --> **Plugins**.
 * Activate it to see if it works.

Congratulations! 🎉 You're now a plugin developer.

Your plugin should have this basic file structure:

```
├── disabled
├── __init__.py
├── manifest.json
├── plugin.py
├── public
│   ├── app.jsx
│   ├── app.scss
│   ├── main.js
│   └── webpack.config.js
└── templates
    └── hello.html
```

An empty `disabled` file in the root indicates that the plugin should not be enabled by default.

## Django Templates

You can render [Django templates](https://docs.djangoproject.com/en/2.2/topics/templates/) (web pages) by placing template files in the `templates` folder. Then you render the templates by creating *mount points* (just like [Django URLs](https://docs.djangoproject.com/en/2.2/topics/http/urls/)).

## Javascript Files

You can execute arbitrary javascript code. When your plugin is enabled, any file returned by `include_js_files` will be included in every WebODM page (in the header). You can use this as your entrypoint for loading more complex Javascript code (e.g. a React build) or for registering a hook.

## CSS Files

Same as for Javascript, you can include arbitrary CSS files via:


```python
def include_css_files(self):
    return ['style.css']
```

## React Components

If you plan to use React (optional) and want to use the built-in system for building the component (also optional), you'll need to declare which `.jsx` files you want to build via:

```python
def build_jsx_components(self):
    return ['app.jsx']
```

The built files will be placed in `coreplugins/my-plugin/public/build/*` and are accessible via `http://localhost:8000/plugins/my-plugin/build/*`.

If you use JSX components, you'll want to restart your development environment with:

```bash
./webodm.sh restart --dev --dev-watch-plugins
```

Otherwise you'll have to manually run `webpack --watch` from the `coreplugins/my-plugin/public` folder (inside the WebODM container).

On the client side, you can import your React components, as well as any other Javascript module, using various hooks. One of such hooks is the `PluginsAPI.App.Ready`, which is triggered on page load:

```javascript
PluginsAPI.App.ready([
        '/plugins/my-plugin/build/app.js',
        '/plugins/my-plugin/build/app.css'        
    ], function(args, App){
    
    ReactDOM.render(React.createElement(App, {greeting: "Hi"}), $("#hello-component").get(0));
});
```

## Client Side Hooks

You can be notified of various client side events via hooks. Some of these hooks allow you to return a DOM element, which can be useful for adding buttons, or other components at different times of the UI rendering process:

```javascript
PluginsAPI.hook([
    // optional list dependencies to load
], function(args, optional dependencies]){
    // Your code here

    // args contains parameters specific to each hook.

    console.log(args);

    var domEl = /* ... */;
    return domEl;
});

```

| <div style="width:260px">Hook</div>                            | Triggered                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `App.ready`                     | On DOM load                                                                                |
| `Dashboard.addTaskActionButton` | When buttons have been added to a task (next to View Map, View 3D Model, ..)             |
| `Dashboard.addNewTaskPanelItem` | When opening the panel after selecting images and GCPs                                    |
| `Dashboard.addNewTaskButton`    | When buttons have been added to a project's panel (next to Select Images and GCP, Import)|
| `Map.willAddControls`           | When Leaflet controls are about to be added                                                    |
| `Map.didAddControls`            | When Leaflet controls have been added                                                          |
| `Map.addActionButton`           | When action buttons (bottom right of the screen) are about to be added                    |
| `SharePopup.addLinkControl`     | When rendering the Share dialog in Map View                                               |

## Client Side Callbacks

Similar to hooks, callbacks can notify you of events happening around the application, but unlike hooks, they don't allow dependencies to be loaded. You can register and unregister callbacks:

```javascript
var myFunction = function(){
    return someValue;
};

PluginsAPI.onCallback(myFunction); // to register
PluginsAPI.offCallback(myFunction); // to unregister
```

For example:

```javascript
PluginsAPI.onHandleClick(function(){
    console.log("Map clicked!");
});
```

| <div style="width:260px">Callback</div> | Triggered When                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `Map.handleClick`                       | Leaflet map is clicked                                                        |
| `Map.addAnnotation`                     | Annotation is about to be added                                               |
| `Map.updateAnnotation`                  | Annotation is about to be changed                                             |
| `Map.deleteAnnotation`                  | Annotation is about to be deleted                                             |
| `Map.toggleAnnotation`                  | Annotation is about to be toggled                                             |
| `Map.annotationDeleted`                 | Annotation has been deleted                                                   |
| `Map.downloadAnnotations`               | A request to download annotations is initiated                                |
| `Map.mapTypeChanged`                    | The map type (Orthophoto to Surface Model, to Plant Health, etc.) has changed |
| `Map.sideBySideChanged`                 | The user has overlayed two layers side-by-side                                |

## NPM dependencies

You can use external dependencies by defining a `package.json` in the `public` folder of your plugin and reference those dependencies in your JSX components (or load them in the browser). This can be created via `npm init`. Dependencies are downloaded and installed automatically during build time.

## PIP dependencies

On the server side, you can install additional Python packages by defining a `requirements.txt` file in the root folder of your plugin (e.g. `coreplugins/myplugin/requirements.txt`).

When the plugin is enabled, the system will first check if any dependency needs to be downloaded and will run `pip install` if required.

In order to avoid versioning/namespacing collisions with WebODM, as well as with other plugins, to use a plugin dependency you need to wrap the import in a `python_imports` context: 

```python
from app.plugins.functions import get_current_plugin

with get_current_plugin().python_imports():
    import numpy as np
    # ...
```