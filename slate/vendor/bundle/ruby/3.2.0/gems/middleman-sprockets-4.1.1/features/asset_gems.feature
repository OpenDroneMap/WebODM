Feature: Make Gem assets available to Sprocket's lookup paths

  An attempt is made to lookup all css, js, image, & font paths in asset gems to be appended to Sprocket's lookup paths. These gems are expected to loosely follow a few conventions:

  - asset root at: `assets`, `app`, `vendor`, `lib`, `app/assets`, `vendor/assets`, or `lib/assets`
  - asset directories named: `javascripts`, `js`, `stylesheets`, `css`, `images`, `img`, or `fonts`

  If not, no worries -- you can append the gems path manually to Sprockets.

  Scenario: An asset gem with assets under vendor
    Using the fixture asset gem located at `fixtures/gems/asset_gem` which puts it's assets in `vendor` like this:
      """
      assets_gem/
      +-- vendor/
          +-- assets/
              +-- css/
              +-- fonts/
              +-- images/
              +-- javascripts/
      """

    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/stylesheets/site.css.scss" with:
      """
      @import "test";
      """
    And the Server is running

    Then sprockets paths should include gem path "assets_gem/vendor/assets/css"
    And sprockets paths should include gem path "assets_gem/vendor/assets/fonts"
    And sprockets paths should include gem path "assets_gem/vendor/assets/images"
    And sprockets paths should include gem path "assets_gem/vendor/assets/javascripts"

    When I go to "/stylesheets/site.css"
    Then I should see:
      """
      body {
        background: #fd0; }
      """

  Scenario: Manually appending a gem's paths
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, 'local_gem', 'resources')
      """
    And a file named "local_gem/resources/stylesheet.css" with:
      """
      body { content: 'local_gem'; }
      """
    And a file named "source/stylesheets/site.css" with:
      """
      //= require stylesheet
      """
    And the Server is running

    When I go to "/stylesheets/site.css"
    Then I should see "content: 'local_gem';"
