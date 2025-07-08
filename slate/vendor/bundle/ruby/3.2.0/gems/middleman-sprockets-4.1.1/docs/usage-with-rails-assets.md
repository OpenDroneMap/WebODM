## Usage with Rails Assets

One of the simplest ways to use middleman-sprockets to manage frontend assets is via [Rails Assets](https://rails-assets.org). Rails Assets is a frictionless proxy between Bundler and Bower to manage Bower-based assets through your existing Gemfile, and then letting the asset pipeline handle the rest.

Here's a quick guide to using Rails Assets with a new Middleman 4 site:

1. Go to [rails-assets.org](https://rails-assets.org) and identify your dependency and version. Chances are it's already there; rails-assets then packages your dependency as a gem on demand for consumption by Bundler.

2. In your Gemfile, add sprockets and a rails-assets block with the gemfiles chosen from step 1:

  ```
  # Gemfile
  gem 'middleman-sprockets', '4.0.0.rc.3'

  source 'https://rails-assets.org' do
    gem 'rails-assets-bootstrap-autohidingnavbar', '1.0.0'
    gem 'rails-assets-jquery', '2.1.1'
    gem 'rails-assets-slick.js', '1.5.7'
  end
  ```

3. In your config.rb, add the following block to enable the asset pipeline and add RailsAssets gems to your load path:

  ```
  # config.rb
  # General configuration
  activate :sprockets

  if defined? RailsAssets
    RailsAssets.load_paths.each do |path|
      sprockets.append_path path
    end
  end
  ```

4. run `bundle install`

5. Add the necessary import statements to your site.css.scss and all.js files. Note that rails-assets may suggest a sprockets `//= slick.js` import statement, but if the library is packaged with SASS, you likely want to use a SASS import `@import "slick.js";` instead.


You may run into edge cases where the assets in the generated gem are not packaged in a traditional way, or if you only need a subset of the library's functionality. In those cases, a quick

```
cd `bundle show gemname`
```

and opening up the library in your text editor will show you the necessary path & file information. In the example above, since slick.js ends with .js, make sure you specify the javascript import as:

```
 //= require slick.js.js
```

Finally, note that you can still use traditional hand-packaged gems like bootstrap-sass and font-awesome-sass in your Gemfile as well. Here's a complete Gemfile for reference:

```
# If you do not have OpenSSL installed, change
# the following line to use 'http://'
source 'https://rubygems.org'

# For faster file watcher updates on Windows:
# gem 'wdm', '~> 0.1.0', platforms: [:mswin, :mingw]

# Windows does not come with time zone data
# gem 'tzinfo-data', platforms: [:mswin, :mingw, :jruby]

# Middleman Gems
gem 'middleman', '>= 4.0.0'
gem 'middleman-livereload'
gem 'middleman-compass', '>= 4.0.0'
gem 'middleman-sprockets', '4.0.0.rc.3'

gem 'bootstrap-sass'
gem 'font-awesome-sass'

source 'https://rails-assets.org' do
  gem 'rails-assets-bootstrap-autohidingnavbar', '1.0.0'
  gem 'rails-assets-jquery', '2.1.1'
  gem 'rails-assets-slick.js', '1.5.7'
end
```
