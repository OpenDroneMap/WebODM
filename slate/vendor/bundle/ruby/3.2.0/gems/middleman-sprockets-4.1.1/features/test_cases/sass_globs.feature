Feature: Sass should glob partials like sass-rails
  Including the `sass-globbing` gem ins required for sass globs to work.

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      require 'sass-globbing'
      activate :sprockets
      """
    And a file named "source/stylesheets/main.css.scss" with:
      """
      @import "**/*";
      """
    And a file named "source/stylesheets/d1/_s1.scss" with:
      """
      .d1s1 { content: 'd1'; }
      """
    And a file named "source/stylesheets/d2/_s1.sass" with:
      """
      .d2s1
        content: 'd2'
      """
    And a file named "source/stylesheets/d2/d3/_s1.sass" with:
      """
      .d3s1
        content: 'd3'
      """
    And a file named "source/stylesheets/d2/d3/_s2.scss" with:
      """
      .d3s2 { content: 'd3'; }
      """

  @sprockets3
  Scenario: Sass globbing should work
    Given the Server is running
    When I go to "/stylesheets/main.css"
    Then I should see ".d1s1"
    And I should see ".d2s1"
    And I should see ".d3s1"
    And I should see ".d3s2"

  @sprockets4
  Scenario: Sass globbing should work
    Sass globbing does not work with SassC, but does still work with Sprockets 4 if using ruby Sass.

    Given a file named "config.rb" with:
      """
      Object.send :remove_const, :SassC if defined?(SassC)# simulate not having sassc
      require 'sass-globbing'
      activate :sprockets
      """
    Given the Server is running
    When I go to "/stylesheets/main.css"
    Then I should see ".d1s1"
    And I should see ".d2s1"
    And I should see ".d3s1"
    And I should see ".d3s2"

  @sprockets3
  Scenario: New files are spotted and imported
    Because of how sass-globbing works, new or changed dependencies aren't spotted. You'll need to change/save the importing stylesheet for them to show up. Adding or removing a newline is a "cheap" trick to trigger the change.

    Given the Server is running
    And a file named "source/stylesheets/d2/_s2.scss" with:
      """
      .d2s2 { content: 'd2s2'; }
      """
    And the file "source/stylesheets/main.css.scss" content is changed to:
      """
      @import "**/*";

      """

    When I go to "/stylesheets/main.css"
    Then I should see ".d2s2"
