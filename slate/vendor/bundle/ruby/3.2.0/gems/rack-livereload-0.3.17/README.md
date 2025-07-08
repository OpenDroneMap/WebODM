# Rack::LiveReload

<a href="http://travis-ci.org/onesupercoder/rack-livereload"><img src="https://secure.travis-ci.org/onesupercoder/rack-livereload.png" /></a>
[![Code Climate](https://codeclimate.com/github/onesupercoder/rack-livereload.png)](https://codeclimate.com/github/onesupercoder/rack-livereload)

Hey, you've got [LiveReload](http://livereload.com/) in my [Rack](http://rack.rubyforge.org/)!
No need for browser extensions anymore! Just plug it in your middleware stack and go!
Even supports browsers without WebSockets!

Use this with [guard-livereload](http://github.com/guard/guard-livereload) for maximum fun!

## Installation

### Rails

Add the gem to your Gemfile.

```ruby
gem "rack-livereload", group: :development
```

Then add the middleware to your Rails middleware stack by editing your `config/environments/development.rb`.

```ruby
# config/environments/development.rb

MyApp::Application.configure do
  # Add Rack::LiveReload to the bottom of the middleware stack with the default options:
  config.middleware.insert_after ActionDispatch::Static, Rack::LiveReload

  # or, if you're using better_errors:
  config.middleware.insert_before Rack::Lock, Rack::LiveReload

  # ...
end
```

#### Tweaking the options

```ruby
# Specifying Rack::LiveReload options.
config.middleware.use(Rack::LiveReload,
  min_delay        : 500,    # default 1000
  max_delay        : 10_000, # default 60_000
  live_reload_port : 56789,  # default 35729
  host             : 'myhost.cool.wow',
  ignore           : [ %r{dont/modify\.html$} ]
)
```

In addition, Rack::LiveReload's position within middleware stack can be
specified by inserting it relative to an exsiting middleware via
`insert_before` or `insert_after`. See the [Rails on Rack: Adding a
Middleware](http://guides.rubyonrails.org/rails_on_rack.html#adding-a-middleware)
section for more detail.

### Sinatra / config.ru

``` ruby
require 'rack-livereload'

use Rack::LiveReload
# ...or...
use Rack::LiveReload, min_delay: 500, ...
```

## How it works

The necessary `script` tag to bring in a copy of [livereload.js](https://github.com/livereload/livereload-js) is
injected right after the opening `head` tag in any `text/html` pages that come through. The `script` tag is built in
such a way that the `HTTP_HOST` is used as the LiveReload host, so you can connect from external machines (say, to
`mycomputer:3000` instead of `localhost:3000`) and as long as the LiveReload port is accessible from the external machine,
you'll connect and be LiveReloading away!

### Which LiveReload script does it use?

* If you've got a LiveReload watcher running on the same machine as the app that responds
  to `http://localhost:35729/livereload.js`, that gets used, with the hostname being changed when
  injected into the HTML page.
* If you don't, the copy vendored with rack-livereload is used.
* You can force the use of either one (and save on the cost of checking to see if that file
  is available) with the middleware option `:source => :vendored` or `:source => :livereload`.

### How about non-WebSocket-enabled browsers?

For browsers that don't support WebSockets, but do support Flash, [web-socket-js](https://github.com/gimite/web-socket-js)
is loaded. By default, this is done transparently, so you'll get a copy of swfobject.js and web_socket.js loaded even if
your browser doesn't need it. The SWF WebSocket implementor won't be loaded unless your browser has no native
WebSockets support or if you force it in the middleware stack:

``` ruby
use Rack::LiveReload, force_swf: true
```

If you don't want any of the web-sockets-js code included at all, use the `no_swf` option:

``` ruby
use Rack::LiveReload, no_swf: true
```

Once more browsers support WebSockets than don't, this option will be reversed and you'll have
to explicitly include the Flash shim.

