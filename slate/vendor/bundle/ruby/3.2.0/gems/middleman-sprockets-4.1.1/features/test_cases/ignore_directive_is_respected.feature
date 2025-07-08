Feature: Files that match ignore directives are not built

  Scenario: Sprockets asset that matches an ignore isn't built # but does link assets
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      ignore "javascripts/vendor/*"
      """
    And a file named "source/javascripts/vendor/site.js" with:
      """
      console.log('vendor/site.js');
      """
    And a file named "source/javascripts/site.js" with:
      """
      //= require 'vendor/site'
      """
    And the Server is running

    When I go to "/javascripts/vendor/site.js"
    Then the status code should be "404"

    When I go to "/javascripts/site.js"
    Then the status code should be "200"
    And I should see "console.log('vendor/site.js');"

    And a built app
    Then the following files should not exist:
      | build/javascripts/vendor/site.js |
    Then the following files should exist:
      | build/javascripts/site.js |

  Scenario: Sprockets assets that are ignored are processed for links
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, 'vendor')
      ignore "javascripts/manifest.js"
      """
    And a file named "vendor/linked.js" with:
      """
      console.log('vendor/linked.js');
      """
    And a file named "source/javascripts/manifest.js" with:
      """
      //= link 'linked'
      """
    And the Server is running

    When I go to "/javascripts/manifest.js"
    Then the status code should be "404"

    When I go to "/assets/linked.js"
    Then the status code should be "200"
    And I should see "console.log('vendor/linked.js');"

    And a built app
    Then the following files should not exist:
      | build/javascripts/manifest.js |
    Then the following files should exist:
      | build/assets/linked.js |


  Scenario: Linked assets that match don't build
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, 'vendor')
      ignore "assets/vendor/*"
      """
    And a file named "vendor/vendor/site.js" with:
      """
      console.log('vendor/site.js');
      """
    And a file named "source/javascripts/manifest.js" with:
      """
      //= link 'vendor/site'
      """
    And the Server is running

    When I go to "/assets/vendor/site.js"
    Then the status code should be "404"

    And a built app
    Then the following files should exist:
      | build/javascripts/manifest.js |
    Then the following files should not exist:
      | build/assets/vendor/site.js |
