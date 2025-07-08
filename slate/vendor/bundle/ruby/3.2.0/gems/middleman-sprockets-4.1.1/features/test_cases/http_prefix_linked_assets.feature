Feature: Allow http_prefix to be prepended correctly to image-url when referencing a linked asset
  Background:
    Given a fixture app "base-app"
      And a file named "source/stylesheets/style.css.scss" with:
        """
        .foo {
          background: image-url("logo.png");
        }
        """

  Scenario: Assets built have the correct http_prefix prepended
    Given a file named "config.rb" with:
      """
      activate :sprockets
      config[:http_prefix] = '/foo/bar'
      """
    And a successfully built app

    When I cd to "build"
    Then the following files should exist:
      | stylesheets/style.css |
      | assets/logo.png |
    And the file "stylesheets/style.css" should contain:
      """
      .foo {
        background: url(/foo/bar/assets/logo.png); }
      """

  Scenario: When http_prefix is not set, just prepend /
    Given a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a successfully built app

    When I cd to "build"
    Then the file "stylesheets/style.css" should contain:
      """
      .foo {
        background: url(/assets/logo.png); }
      """

  Scenario: relative_assets should still work
    Given a file named "config.rb" with:
      """
      activate :sprockets
      activate :relative_assets
      """
    And a successfully built app

    When I cd to "build"
    Then the file "stylesheets/style.css" should contain:
      """
      .foo {
        background: url(../assets/logo.png); }
      """
