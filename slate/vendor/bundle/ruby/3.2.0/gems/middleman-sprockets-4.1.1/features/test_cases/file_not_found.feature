Feature: Throw sane error when Sprockets doesn't find an asset

  Scenario: When a file is removed, a FileNotFound is caught
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets

      # trick to ensure sprockets has no paths to
      # lookup assets
      ready do
        sprockets.clear_paths
      end
      """
    And a file named "source/stylesheets/main.css.scss" with:
      """
      body { content: 'main'; }
      """
    And a file named "source/javascripts/main.js.coffee" with:
      """
      console.log 'main'
      """
    And the Server is running

    When I go to "/stylesheets/main.css"
    Then I should see "Sprockets::FileNotFound: stylesheets/main.css"

    When I go to "/javascripts/main.js"
    Then I should see "Sprockets::FileNotFound: javascripts/main.js"

  Scenario: Importing a missing sass file
    In Sprockets 4, with ruby Sass -- having environment available is required otherwise the printer for load path with fail.

    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      # simulate not having sassc
      # trying to catch a spefic sprockets error
      #
      Object.send :remove_const, :SassC if defined?(SassC)
      activate :sprockets do |c|
        c.expose_middleman_helpers = true
      end
      """
    And a file named "source/stylesheets/site.css.scss" with:
      """
      @import "missing";
      """
    And the Server is running

    When I go to "/stylesheets/site.css"
    Then I should see "Error: File to import not found or unreadable: missing."
