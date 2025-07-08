Feature: Using assets installed via Bower

  Usage with Bower is fairly barebones -- for now we don't do anything fancy to detect which files to link by reading bower.json files. A typical workflow looks something like this:

  - create your `ROOT/bower.json` & install via bower to `ROOT/bower_components`
  - append `bower_components` to sprockets paths
  - either require assets for use, or create a `manifest.js` that links files

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, "bower_components")
      """
    And a file named "bower_components/underscore/underscore.js" with:
      """
      var _ = {};
      return _;
      """
    And a file named "source/javascripts/application.js" with:
      """
      //= require underscore/underscore
      """

  Scenario: Sprockets can require underscore from bower
    Given the Server is running

    Then sprockets paths should include "bower_components"
    When I go to "/javascripts/application.js"
    Then I should see "return _;"


  Scenario: Sprockets can build when requiring underscore from bower
    And a successfully built app

    When I cd to "build"
    Then the following files should exist:
      | javascripts/application.js |
    And the file "javascripts/application.js" should contain "return _;"


  Scenario: Assets can be added to the sitemap by linking them in a manifest
    Given a file named "source/javascripts/manifest.js" with:
      """
      //= link underscore/underscore
      """
    And the Server is running

    When I go to "/assets/underscore/underscore.js"
    Then I should see "return _;"


  Scenario: Assets which haven't been linked aren't added to the sitemap
    Given a file named "bower_components/underscore/hello.js" with:
      """
      console.log('hello');
      """
    And the Server is running

    When I go to "/assets/underscore/hello.js"
    Then the status code should be "404"


  Scenario: Assets have an individual output directory
    Given a file named "vendor/assets/lightbox2/hello.js" with:
      """
      console.log('hello');
      """
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, "bower_components")
      sprockets.append_path File.join(root, "vendor/assets")
      """
    And a file named "source/javascripts/manifest.js" with:
      """
      //= link underscore/underscore
      //= link lightbox2/hello
      """
    And the Server is running

    When I go to "/assets/underscore/underscore.js"
    Then I should see "return _;"

    When I go to "/assets/lightbox2/hello.js"
    Then I should see "console.log('hello');"


  Scenario: Sprockets should not mess with bower.json if it's in source
    Given a file named "source/javascripts/bower.json" with:
      """
      {
        "name": "my-project",
        "version": "1.0.0",
        "main": "application.js"
      }
      """
    And the Server is running

    When I go to "/javascripts/bower.json"
    Then I should see '"name": "my-project",'
