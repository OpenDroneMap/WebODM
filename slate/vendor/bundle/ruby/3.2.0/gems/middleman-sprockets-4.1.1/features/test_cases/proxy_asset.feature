Feature: Handles proxied assets

  Scenario: Proxied assets can be renderable via Sprockets
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      proxy "assets/vendor/site.js", "vendor/site.js"

      activate :sprockets
      sprockets.append_path File.join(root, "source", "vendor")
      """
    And a file named "source/vendor/site.js" with:
      """
      alert("site.js");
      """
    And the Server is running

    When I go to "/assets/vendor/site.js"
    Then I should see 'alert("site.js");'

  Scenario: Proxied assets should be able to require files relative to their source
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      proxy "assets/vendor/site.js", "vendor/site.js"

      activate :sprockets
      sprockets.append_path File.join(root, "source", "vendor")
      """
    And a file named "source/vendor/_include.js" with:
      """
      console.log("include");
      """
    And a file named "source/vendor/site.js" with:
      """
      //= require "_include.js"
      """
    And the Server is running

    When I go to "/assets/vendor/site.js"
    Then I should see 'console.log("include");'

    When I go to "/vendor/site.js"
    Then I should see 'console.log("include");'


  Scenario: Proxied assets can ignore their source file
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      proxy "javascripts/site.js", "vendor/site.js", ignore: true

      activate :sprockets
      sprockets.append_path File.join(root, "source", "vendor")
      """
    And a file named "source/vendor/_include.js" with:
      """
      console.log("include");
      """
    And a file named "source/vendor/site.js" with:
      """
      //= require "_include.js"
      """
    And the Server is running

    When I go to "/javascripts/site.js"
    Then I should see 'console.log("include");'

    When I go to "/vendor/site.js"
    Then the status code should be "404"
