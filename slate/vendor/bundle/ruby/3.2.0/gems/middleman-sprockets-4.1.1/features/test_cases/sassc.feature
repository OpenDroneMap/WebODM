Feature: Usage of SassC

  Scenario: Using SassC
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      require "sassc"
      activate :sprockets
      """
    And a file named "source/stylesheets/site.css.scss" with:
      """
      $color: #fff;

      html {
        body {
          color: #fff;
        }
      }
      """
    And the Server is running

    When I go to "/stylesheets/site.css"
    Then I should see:
      """
      html body {
        color: #fff; }
      """
