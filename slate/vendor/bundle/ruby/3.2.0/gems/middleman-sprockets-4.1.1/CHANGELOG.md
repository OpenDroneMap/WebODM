4.1.1
=====
**fixes**
- support sprockets renderable proxied assets, fixes [#128] related to how the I18n extension moves assets.

4.1.0
=====

**fixes**
- respect http_prefix in asset_path helper [@vvasabi](https://github.com/middleman/middleman-sprockets/pull/124)

**features**
- allow passing proc/class to `imported_asset_path` option to determine imported asset location [@vvasabi](https://github.com/middleman/middleman-sprockets/pull/123)


4.0.0
=====

This is a major rewrite focussed on adding support for Sprockets 3+ & Middleman 4+. With this come a lot of changes, please read the [upgrade guide](docs/upgrade-3-to-4.md) for more information:

**tl;dr;**

* Requires Middleman 4.0+ & Sprockets 3.0+
* Remove auto-activation
* Remove the `import_asset` helper, assets should be linked via a manifest file
* Remove "automagical" asset placement, linked assets all go in the `imported_asset_path` option
* Add option to expose middleman helpers to sprockets assets
* Add compatability for SassC if using Sprockets 4+


3.4.2
===

* Add Woff2 support.

3.3.2
===

* Remove file-based cache (`.cache` folder), which did not invalidate correctly and led to a lot of problems with assets not updating.
* It is now possible to configure Sprockets via `sprockets.append_path` and `sprockets.import_asset` without having to wrap it in a `ready` block.

3.3.1
===

* Fix import_asset for Bower and other import paths that don't end in /javascripts, /stylesheets, etc.

3.3.0
===

* Prep work for Middleman v4.
* Work around sstephenson/sprockets#533 by serving bower.json directly, skipping Sprockets.
* Only attempt to patch up Sass if Sass is present.
* :bower_dir is deprecated in favor of just adding your bower_components folder to the sprockets load path.
* Convert to a new-style Middleman extension. #48
* Use a file-based cache to persist compiled assets between sessions #47

3.2.0
===

* Require Middleman 3.2 or later.
* No longer require 'middleman-more'
* Fix import_asset. #38

3.1.3
===

* Fix files names like guids, which Sprockets thinks are asset hashes.

3.1.2
===

* Fix debug_assets for CSS

3.1.1
===

* Add sprockets-helpers to the list of dependencies to fix various path-related bugs. #34
* Patch generated_image_url so that Compass sprites work. middleman/middleman#890.
* Output .jst, .eco, and .ejs files with a .js extension. middleman/middleman#888.
* Fix :debug_assets for files that include scripts from gems. #29.
* :debug_assets will now expand CSS included via Sprockets requires as well as JavaScript. #30

3.1.0
===

* Hack around infinite recursion between bootstrap-sass and sprockets-sass. middleman/middleman#864
* Fix for fonts in Sass files having ".font" appended to them. middleman/middleman#866.
* Enable in-memory caching in Sprockets, so unchanged assets don't get recompiled when other assets change. #25
* Refuse to serve gem-assets that haven't been added to the Middleman sitemap. #23
* Allow importing JS/CSS assets from gems by their logical path, using `sprockets.import_asset`. #23
* Fix a bug where, when `:debug_assets` was enabled, refreshing the page would produce the wrong JavaScript include path. #26

3.0.11
===

* Fonts are now included in the Sprockets load path.
* When `:debug_assets` is on, do not add `?body=1` multiple times. #24
* :js_assets_paths configuration is deprecated in favor of just calling sprockets.append_path. #22
* Sprockets integration, especially with regard to helper methods, is significantly improved. #22
* Images and fonts from gems added to the Sprockets load path will now be copied to the build output. #22
* Compatibility with newer Sprockets versions.

3.0.10
===

* No longer expire Sprockets index in development mode. #18
