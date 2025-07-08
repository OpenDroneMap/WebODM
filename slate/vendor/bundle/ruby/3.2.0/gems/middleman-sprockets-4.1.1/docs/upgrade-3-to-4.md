Version 4 represents a major rewrite of Middleman-Sprockets to maintain support for Middleman 4+ & gain support of Sprockets 3+. With this come a lot of changes, some you'll make in your code and others in your expectations.


## Activation

The biggest change to start with is the removal of auto-activation. Since some configuration options have been added, this makes configuring them follow the norm for other extensions. To activate, in your `config.rb`:

```ruby
activate :sprockets
```

After activation you can still access the sprockets environment to append paths

```ruby
activate :sprockets
sprockets.append_path File.join(root, 'bower_components')
```


## Importing Assets

For adding assets from a gem or bower you may have been used to using `sprockets.import_asset ASSET_PATH` and having it added to the sitemap based on it's type. The process for this is considerably different now.

First, the `#import_asset` method has been removed, instead you should add a [link directive](https://github.com/rails/sprockets#the-link-directive) to reference the file you want imported. To follow along with the rails convension and import files that aren't necessarily linked from other assets -- add a manifest file. For example lets say we want to import fonts from [Font-Awesome](https://github.com/FortAwesome/Font-Awesome).

Assuming Font-Awesome has been installed with bower:

```ruby
# config.rb
activate :sprockets
sprockets.append_path File.join(root, 'bower_components')
```

```javascript
// source/javascripts/manifest.js
//
//= link font-awesome-webfont.eot
//= link font-awesome-webfont.svg
//= link font-awesome-webfont.ttf
//= link font-awesome-webfont.wof
//= link font-awesome-webfont.wof2
```

This will import the fonts into the sitemap under the configured `imported_asset_path`. So on build it would look like:

```
build/
+-- assets/
    +-- font-awesome-webfont.eot
    +-- font-awesome-webfont.svg
    +-- font-awesome-webfont.ttf
    +-- font-awesome-webfont.wof
    +-- font-awesome-webfont.wof2
```

You may have noticed that second difference from 3.x -- the fonts weren't placed into `:font_dir`. Instead of trying to determine file type & using that path -- with 4.x all imported assets are placed under the `imported_asset_path`.

This path defaults to `assets` and is configurable:

```ruby
# config.rb
activate :sprockets do |c|
  c.imported_asset_path = 'imported'
end
sprockets.append_path File.join(root, 'bower_components')
```

```javascripts
// source/javascripts/manifest.js
//
//= link font-awesome-webfont.eot
```

```
build/
+-- imported/
    +-- font-awesome-webfont.eot
```


In addition to importing assets through link directives, assets can also be linked via any of the path helper methods. Again, looking at font-awesome instead of using a manifest file -- lets link it directly from our css that will use it:

```css
/* source/stylesheets/fonts.css.scss */

@font-face {
  font-family: "Font Awesome";
  src: font-url('font-awesome-webfont.eot');
}
```

```
build/
+-- assets/
    +-- font-awesome-webfont.eot
```

Check out the [feature test](../features/linked_assets.feature) for more specifics.


## Middleman Helpers

Helpers are no longer included in the sprockets rendering context by default. To expose them, configure `expose_middleman_helpers` to true:

```ruby
# config.rb
activate :sprockets do |c|
  c.expose_middleman_helpers = true
end
```


## Less Support

With 3.x Sprockets has [dropped support for Less](https://github.com/sstephenson/sprockets/pull/547), so be aware that your `.less` files are handled by Middleman directly. As a concequence, sprockets directives or importing of assets won't work.


> Run into an issue or think something is missing? [Let us know](https://github.com/middleman/middleman-sprockets/issues/new) or submit a pull request to help us improve.
