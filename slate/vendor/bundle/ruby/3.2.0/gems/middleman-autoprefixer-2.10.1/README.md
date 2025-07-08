[![Gem version](https://img.shields.io/gem/v/middleman-autoprefixer.svg)](https://rubygems.org/gems/middleman-autoprefixer) [![Build status](https://img.shields.io/travis/middleman/middleman-autoprefixer.svg)](https://travis-ci.org/middleman/middleman-autoprefixer) [![Coveralls](https://img.shields.io/coveralls/middleman/middleman-autoprefixer.svg)](https://coveralls.io/r/middleman/middleman-autoprefixer) [![Dependency status](https://img.shields.io/gemnasium/middleman/middleman-autoprefixer.svg)](https://gemnasium.com/middleman/middleman-autoprefixer)

# Middleman::Autoprefixer

> Automatically vendor-prefix stylesheets served by Middleman.

## Usage

Add the following line to `Gemfile`, then run `bundle install`:

```ruby
gem 'middleman-autoprefixer'
```

After installation, activate (and optionally configure) the extension in `config.rb`:

```ruby
activate :autoprefixer
```

```ruby
activate :autoprefixer do |config|
  config.browsers = ['last 2 versions', 'Explorer >= 9']
  config.ignore   = ['/stylesheets/hacks.css']
end
```

## Available options

### browsers

The list of targeted browsers. Takes values and uses defaults accordingly to [Autoprefixer’s documentation](https://github.com/postcss/autoprefixer#browsers).

### add

Whether to add vendor prefixes: `true` or `false`. Enabled by default.

### remove

Whether to remove outdated prefixes: `true` or `false`. Enabled by default.

### cascade

The visual cascade of prefixed properties: `true` or `false`. Enabled by default.

### inline

Whether to process inline styles within HTML files: `true` or `false`. Disabled by default.

### ignore

The array of patterns or paths to exclude from processing. Empty by default.

## License

Middleman Autoprefixer was created by [Dominik Porada](https://github.com/porada) and is distributed under the [MIT](http://porada.mit-license.org/) license.
