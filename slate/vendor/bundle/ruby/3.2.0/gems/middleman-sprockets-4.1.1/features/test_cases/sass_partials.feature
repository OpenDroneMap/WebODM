Feature: Sass partials should work with Sprockets
  Confirm that changing assets will be reflected in a files output, even if it is included as a partial.

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/stylesheets/_partial.scss" with:
      """
      body { color: red; }
      """

  Scenario: The stylesheet shows updated content when Sprockets partials change
    Given a file named "source/stylesheets/main.css.scss" with:
      """
      @import "partial";
      """
    And the Server is running

    When I go to "/stylesheets/main.css"
    Then I should see "color: red;"

    And the file "source/stylesheets/_partial.scss" content is changed to:
      """
      body { color: blue; }
      """

    When I go to "/stylesheets/main.css"
    Then I should see "color: blue;"

  Scenario: The stylesheet shows updated content when an imported partial changes
    Given a file named "source/stylesheets/main.css.scss" with:
      """
      //= require _partial
      """
    And the Server is running

    When I go to "/stylesheets/main.css"
    Then I should see "color: red;"

    And the file "source/stylesheets/_partial.scss" content is changed to:
      """
      body { color: blue; }
      """

    When I go to "/stylesheets/main.css"
    Then I should see "color: blue;"
