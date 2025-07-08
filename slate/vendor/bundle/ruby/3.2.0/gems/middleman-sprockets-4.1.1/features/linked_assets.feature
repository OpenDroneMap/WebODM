Feature: Linked assets are included in the sitemap

  Assets that are linked, either through a `//= link` directive or with an asset url helper (like `asset_path`) will be included in the sitemap & built automatically. The path these assets are placed at is configurable with the `:imported_asset_path` option.

  Note that we're taking advantage of the fact that the `assets_gem` is included in the sprockets paths with these examples.

  Scenario: Assets linked with a Sprockets directive
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/stylesheets/manifest.js" with:
      """
      //= link logo.png
      """
    And the Server is running

    When I go to "/assets/logo.png"
    Then the status code should be "200"


  Scenario: Assets linked using a path helper
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/stylesheets/site.css.scss" with:
      """
      @import 'import';
      """
    And a file named "source/stylesheets/_import.scss" with:
      """
      body {
        background: image-url('logo.png');
      }
      """
    And the Server is running

    When I go to "/assets/logo.png"
    Then the status code should be "200"

    When I go to "/stylesheets/site.css"
    Then I should see "url(/assets/logo.png)"


  Scenario: Linked asset destination is configurable
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets do |c|
        c.imported_asset_path = 'linked'
      end
      """
    And a file named "source/javascripts/manifest.js" with:
      """
      //= link logo.png
      """
    And the Server is running

    When I go to "/linked/logo.png"
    Then the status code should be "200"


  Scenario: Linked assets can be rendered
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "vendor/css/vendored.css.sass" with:
      """
      body
        color: red
      """
    And a file named "vendor/js/vendored.js.coffee" with:
      """
      console.log 'hello'
      """
    And a file named "source/javascripts/manifest.js" with:
      """
      //= link 'vendored.css'
      //= link 'vendored.js'
      """
    And the Server is running

    When I go to "/assets/vendored.css"
    Then I should see "color: red;"

    When I go to "/assets/vendored.js"
    Then I should see "console.log('hello')"


  Scenario: Linking to Sprockets assets from Middleman
    You can do this, but you need to make sure that the asset is imported into the sitemap. If the asset is linked via a Sprockets directive or path helper no worries -- otherwise you could create a manifest file that contains links to assets you need.

    In this test case, remember the `assets_gem` is available.

    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/index.html.erb" with:
      """
      <%= image_tag('assets/logo.png') %>
      """
    And the Server is running

    When I go to "/assets/logo.png"
    Then the status code should be "404"

    And the file "source/javascripts/manifest.js" has the contents
      """
      //= link 'logo.png'
      """

    When I go to "/assets/logo.png"
    Then the status code should be "200"

    When I go to "/"
    Then I should see '<img src="/assets/logo.png"'
