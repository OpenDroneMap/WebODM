Feature: Exception response for assets
  It's usefull when running preview server to have assets include an exception response instead of just returning a 500. These exceptions shouldn't be caught during build though so they will show up in the output.

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/stylesheets/site.css.scss" with:
      """
      body { color: $missing-variable; }
      """
    And a file named "source/javascripts/site.js.coffee" with:
      """
      bad:
      """

  Scenario: Preview server displays an exception in the language it was generated
    Given the Server is running

    When going to "/stylesheets/site.css" should not raise an exception
    And I should see 'Error: Undefined variable: "$missing-variable"'

    When going to "/javascripts/site.js" should not raise an exception
    And I should see 'throw Error("ExecJS::RuntimeError: SyntaxError:'


  Scenario: Exceptions are raised during build
    Given a built app
    Then the exit status should be 1
