Feature: Using assets gems assets

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, 'vendor')
      """
    And a file named "source/javascripts/require_from_assets_gem.js" with:
      """
      //= require _imports/import
      """
    And a file named "source/stylesheets/require_from_assets_gem.css" with:
      """
      //= require test
      """
    And a file named "vendor/javascripts/vendor_import.js" with:
      """
      console.log('vendor');
      """
    And a file named "source/javascripts/require_from_vendor.js" with:
      """
      //= require vendor_import
      """
    And a file named "vendor/stylesheets/vendor_import.css" with:
      """
      body { content: 'vendor'; }
      """
    And a file named "source/stylesheets/require_from_vendor.css" with:
      """
      //= require vendor_import
      //= require with_img
      """
    And a file named "vendor/stylesheets/with_img.css.scss" with:
      """
      body { background: image-url('vendor_gem/logo.png'); }
      """
    And a file named "vendor/images/vendor_gem/logo.png" with:
      """
      """

  Scenario: Assets are requirable from a gem
    Given the Server is running

    When I go to "/javascripts/require_from_assets_gem.js"
    Then I should see 'alert("imported");'

    When I go to "/stylesheets/require_from_assets_gem.css"
    Then I should see "background: #fd0;"


  Scenario: Assets are requirable from a custom vendor dir
    Given the Server is running

    When I go to "/javascripts/require_from_vendor.js"
    Then I should see "console.log('vendor');"

    When I go to "/stylesheets/require_from_vendor.css"
    Then I should see "content: 'vendor';"

  Scenario: Gem images have correct path in preview
    Given the Server is running

    When I go to "/stylesheets/require_from_vendor.css"
    Then I should see "url(/assets/images/vendor_gem/logo.png)"


  Scenario: Gem images have correct path in build
    Given a successfully built app
    When I cd to "build"
    Then the following files should exist:
      | stylesheets/require_from_vendor.css |
      | assets/images/vendor_gem/logo.png |
    And the file "stylesheets/require_from_vendor.css" should contain 'url(/assets/images/vendor_gem/logo.png)'

  Scenario: Gem images have correct paths when :relative_assets is activated
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, 'vendor')

      activate :relative_assets
      """
    And the Server is running

    When I go to "/stylesheets/require_from_vendor.css"
    Then I should see 'url(../assets/images/vendor_gem/logo.png)'
