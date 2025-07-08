Feature: Usage of MM's environment method in a Sprockets asset
  In some cases sprockets requires `environment` to return the sprockets environment so we can't overwrite that method in our rendering context. Instead you should use the `environment?` method to test against.

  If the raw symbol for the environment is required, you can call `app.environment`.

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets do |c|
        c.expose_middleman_helpers = true
      end
      """
    And a file named "source/javascripts/site.js.erb" with:
      """
      console.log('In development? <%= environment?(:development) ? "yes" : "no" %>');
      console.log('<%= app.environment %>');
      """


  Scenario: Should output the sprockets environment on build
    Given a successfully built app
    And I cd to "build"

    Then the file "javascripts/site.js" should contain "console.log('In development? no');"


  Scenario: Should output the environment in preview server calling app.environment
    Given the Server is running
    And I go to "/javascripts/site.js"

    Then I should see "console.log('development');"
