(unreleased)
===

* Support secure sockets (WSS) with options for TLS certificate & private key.

3.3.0
===

* Explicitly use the vendored livereload.js - otherwise it will attempt to load it from a location that doesn't exist.
* Remove `:grace_period` setting, which was unnecessary.
* Properly ignore changes to files that should not cause a reload, and pay attention to some files that used to be ignored but shouldn't have been.
* Send logging to the logger rather than STDOUT.
* No longer rely on MultiJson.
* Require Ruby 1.9.3 or greater.

3.2.1
===

* Loosen dependency on `middleman-core`.

3.2.0
===

* Only run in `:development` environment.
* No longer compatible with Middleman < 3.2

3.1.1
===

* Added `:no_swf` option to disable Flash websockets polyfill.

3.1.0
===

* Compatibility with Middleman 3.1+ style extension API.
* Ignore ignored sitemap files.
* Preserve the reactor thread across preview server reloads.
* Implement a `:grace_period` setting.
