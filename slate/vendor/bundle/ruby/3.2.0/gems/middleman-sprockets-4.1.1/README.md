> The master branch is the 4.x version of Middleman-Sprockets.
> - If you're upgrading from 3.x, the [upgrading guide](docs/upgrade-3-to-4.md) should get you started.
> - For 3.x stable usage please see the [`v3-stable-real` branch](https://github.com/middleman/middleman-sprockets/tree/v3-stable-real)

# Middleman-Sprockets

`middleman-sprockets` is an extension for the [Middleman] static site generator that allows support for [Sprockets](https://github.com/sstephenson/sprockets) in your assets.


## Installation

If you're just getting started, install the `middleman` gem and generate a new project:

```
gem install middleman
middleman init MY_PROJECT
```

Then add `gem "middleman-sprockets"` to your `Gemfile` and run `bundle install`

To activate the extension, in your `config.rb` add:

```ruby
activate :sprockets
```

### Usage

- [Basic Usage](features/basic_usage.feature)
- [With Rails Assets](docs/usage-with-rails-assets.md)
- [With Asset Gems](features/asset_gems.feature)
- [With Bower](features/bower.feature)
- [Linked Assets](features/linked_assets.feature)
- [Helpers](features/middleman_helpers.feature)

### Configuration

There are currently two options for configuration, `imported_asset_path` and `expose_middleman_helpers`.

**`imported_asset_path` [default: 'assets']**

This is the path imported/linked assets will be added to the sitemap. For example, in the bower fixture app, the `/javascripts/core.js` file has `//= link "lightbox2/img/close.png"`. This linked asset will be added to the sitemap at `/assets/lightbox2/img/close.png`.

To configure, in `config.rb`:

```ruby
activate :sprockets do |c|
  c.imported_asset_path = "YOUR_PATH"
end
```

You can also pass an object (proc/lambda/class) that responds to `#call` to `imported_asset_path` to conditionally determine where assets go.

```ruby
activate :sprockets do |c|
  c.imported_asset_path = ->(sprockets_asset) do
    if sprockets_asset.logical_path =~ /\.js$/
      # all files ending with .js get put in /vendor-js
      File.join('vendor-js', sprockets_asset.logical_path)
    else
      # other assets head to /imported
      File.join('imported', sprockets_asset.logical_path)
    end
  end
end
```

[View the imported_asset_processor test](features/test_cases/imported_asset_processor.feature) for an example using a class.


**`expose_middleman_helpers` [default: false]**

Sometimes you might need sprockets to have access helpers (for example using different keys depending on deployment environment). Getting this to happen is bound to be full of edge cases, so for now it's behind a configuration option.

If you need [Middleman helpers in your Sprockets](http://i.imgur.com/fINMSsz.jpg), in `config.rb`:

```ruby
activate :sprockets do |c|
  c.expose_middleman_helpers = true
end
```


## Build & Dependency Status

[![Gem Version](https://badge.fury.io/rb/middleman-sprockets.svg)][gem]
[![Build Status](https://travis-ci.org/middleman/middleman-sprockets.svg)][travis]
[![Dependency Status](https://gemnasium.com/middleman/middleman-sprockets.svg?travis)][gemnasium]
[![Code Quality](https://codeclimate.com/github/middleman/middleman-sprockets.svg)][codeclimate]


## Community

The official community forum is available at: http://forum.middlemanapp.com


## Bug Reports

Github Issues are used for managing bug reports and feature requests. If you run into issues, please search the issues and submit new problems: https://github.com/middleman/middleman-sprockets/issues

The best way to get quick responses to your issues and swift fixes to your bugs is to submit detailed bug reports, include test cases and respond to developer questions in a timely manner. Even better, if you know Ruby, you can submit [Pull Requests](https://help.github.com/articles/using-pull-requests) containing Cucumber Features which describe how your feature should work or exploit the bug you are submitting.


## How to Run Cucumber Tests

1. Checkout Repository: `git clone https://github.com/middleman/middleman-sprockets.git`
2. Install Bundler: `gem install bundler`
3. Run `bundle install` inside the project root to install the gem dependencies.
4. Run test cases: `bundle exec rake test`

To run specs for an individual feature, `cucumber features/PATH_TO_FEATURE`

## Donate

[Click here to lend your support to Middleman](https://spacebox.io/s/4dXbHBorC3)


## License

Copyright (c) 2012-2016 Thomas Reynolds. MIT Licensed, see [LICENSE] for details.

[middleman]: http://middlemanapp.com
[gem]: https://rubygems.org/gems/middleman-sprockets
[travis]: http://travis-ci.org/middleman/middleman-sprockets
[gemnasium]: https://gemnasium.com/middleman/middleman-sprockets
[codeclimate]: https://codeclimate.com/github/middleman/middleman-sprockets
[LICENSE]: https://github.com/middleman/middleman-sprockets/blob/master/LICENSE.md
