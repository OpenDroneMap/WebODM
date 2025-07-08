# Autoprefixer Rails [![Build Status][ci-img]][ci]

<img align="right" width="94" height="71"
     src="http://postcss.github.io/autoprefixer/logo.svg"
     title="Autoprefixer logo by Anton Lovchikov">

[Autoprefixer] is a tool to parse CSS and add vendor prefixes to CSS rules
using values from the [Can I Use] database. This gem provides Ruby
and Ruby on Rails integration with this JavaScript tool.

<a href="https://evilmartians.com/?utm_source=autoprefixer-rails">
<img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg" alt="Sponsored by Evil Martians" width="236" height="54">
</a>

[Autoprefixer]:     https://github.com/postcss/autoprefixer
[Can I Use]:        http://caniuse.com/
[PostCSS]:          https://postcss.org/
[ci-img]:           https://travis-ci.org/ai/autoprefixer-rails.svg
[ci]:               https://travis-ci.org/ai/autoprefixer-rails

## Differences

The best way to use Autoprefixer is with webpack or Gulp.

Autoprefixer Rails doesn’t support these Autoprefixer features:

* Browsers in `package.json`.
* Custom browsers usage statistics.

## Usage

Windows users should install [Node.js]. Autoprefixer Rails doesn’t work with
old JScript in Windows.

Autoprefixer Rails uses [ExecJS] that will use the best available JavaScript
runtime. Currently this gem is tested to work with Node.js version 6 and up and
with [mini_racer], but will not work with [therubyracer].

[Node.js]: http://nodejs.org/
[ExecJS]: https://github.com/rails/execjs
[mini_racer]: https://github.com/discourse/mini_racer
[therubyracer]: https://github.com/cowboyd/therubyracer

### Ruby on Rails

Add the `autoprefixer-rails` gem to your `Gemfile`:

```ruby
gem "autoprefixer-rails"
```

Clear your cache:

```sh
rake tmp:clear
```

Write your CSS (Sass, Stylus, LESS) rules without vendor prefixes
and Autoprefixer will apply prefixes for you.
For example in `app/assets/stylesheet/foobar.sass`:

```sass
:fullscreen a
  display: flex
```

Autoprefixer uses the Can I Use database with browser statistics and properties
support to add vendor prefixes automatically using the Asset Pipeline:

```css
:-webkit-full-screen a {
    display: -webkit-box;
    display: -webkit-flex;
    display: flex
}
:-moz-full-screen a {
    display: flex
}
:-ms-fullscreen a {
    display: -ms-flexbox;
    display: flex
}
:fullscreen a {
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex
}
```

If you need to specify browsers for your Rails project, you can save them
to `.browserslistrc` and place it under `app/assets/stylesheets/`
or any of its ancestor directories

```
> 1%
last 2 versions
IE > 8 # comment
```

See [Browserslist docs] for config format. But `> 5% in US` query is not
supported in Rails, because of ExecJS limitations. You should migrate to webpack
or Gulp if you want it.

__Note: you have to clear cache (`rake tmp:clear`) for the configuration
to take effect.__

You can get what properties will be changed using a Rake task:

```sh
rake autoprefixer:info
```

To disable Autoprefixer just remove postprocessor:

```ruby
AutoprefixerRails.uninstall(Rails.application.assets)
```

[Browserslist docs]: https://github.com/ai/browserslist
[Firefox ESR]:       http://www.mozilla.org/en/firefox/organizations/faq/

### Sprockets

If you use Sinatra or another non-Rails framework with Sprockets,
just connect your Sprockets environment with Autoprefixer and write CSS
in the usual way:

```ruby
assets = Sprockets::Environment.new do |env|
  # Your assets settings
end

require "autoprefixer-rails"
AutoprefixerRails.install(assets)
```

### Ruby

If you need to call Autoprefixer from plain Ruby code, it’s very easy:

```ruby
require "autoprefixer-rails"
prefixed = AutoprefixerRails.process(css, from: 'main.css').css
```

### Compass

You should consider using Gulp instead of Compass binary,
because it has better Autoprefixer integration and many other awesome plugins.

But if you can’t move from Compass binary right now, there’s a hack
to run Autoprefixer after `compass compile`.

Install `autoprefixer-rails` gem:

```
gem install autoprefixer-rails
```

and add post-compile hook to `config.rb`:

```ruby
require 'autoprefixer-rails'

on_stylesheet_saved do |file|
  css = File.read(file)
  map = file + '.map'

  if File.exists? map
    result = AutoprefixerRails.process(css,
      from: file,
      to:   file,
      map:  { prev: File.read(map), inline: false })
    File.open(file, 'w') { |io| io << result.css }
    File.open(map,  'w') { |io| io << result.map }
  else
    File.open(file, 'w') { |io| io << AutoprefixerRails.process(css) }
  end
end
```

## Visual Cascade

By default, Autoprefixer will change CSS indentation to create nice visual
cascade of prefixes.

```css
a {
  -webkit-box-sizing: border-box;
     -moz-box-sizing: border-box;
          box-sizing: border-box
}
```

You can disable this by specifying `cascade: false` in `config/autoprefixer.yml`
or in `process()` options.

## Source Map

Autoprefixer will generate a source map if you set `map` option to `true` in
`process` method.

You must set input and output CSS files paths (by `from` and `to` options)
to generate correct map.

```ruby
result = AutoprefixerRails.process(css,
    map:   true,
    from: 'main.css',
    to:   'main.out.css')
```

Autoprefixer can also modify previous source map (for example, from Sass
compilation). Just set original source map content (as string) to `map` option:

```ruby
result = AutoprefixerRails.process(css, {
    map:   File.read('main.sass.css.map'),
    from: 'main.sass.css',
    to:   'main.min.css')

result.map #=> Source map from main.sass to main.min.css
```

See all options in [PostCSS docs]. AutoprefixerRails will convert Ruby style
to JS style, so you can use `map: { sources_content: false }`
instead of camelcase `sourcesContent`.

[PostCSS docs]: https://github.com/postcss/postcss#source-map-1


## Security Contact

To report a security vulnerability, please use the [Tidelift security contact].
Tidelift will coordinate the fix and disclosure.

[Tidelift security contact]: https://tidelift.com/security
