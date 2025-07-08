Feature: Long Filenames

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/images/00000000-0000-0000-0000-000000.svg" with:
      """
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xlink="http://www.w3.org/1999/xlink" width="300" height="300">
        <rect width="100" height="100" fill="#f06"></rect>
      </svg>
      """
    And a file named "source/images/00000000-0000-0000-0000-0000001.svg" with:
      """
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xlink="http://www.w3.org/1999/xlink" width="300" height="300">
        <rect width="100" height="100" fill="#f06"></rect>
      </svg>
      """

  Scenario: Checking built folder for content
    Given a successfully built app

    When I cd to "build"
    Then the following files should exist:
      | images/00000000-0000-0000-0000-000000.svg |
      | images/00000000-0000-0000-0000-0000001.svg |
    And the file "images/00000000-0000-0000-0000-000000.svg" should contain "<svg xmlns"
    And the file "images/00000000-0000-0000-0000-0000001.svg" should contain "<svg xmlns"


  Scenario: Rendering html
    Given the Server is running

    When I go to "/images/00000000-0000-0000-0000-000000.svg"
    Then I should see "<svg xmlns"

    When I go to "/images/00000000-0000-0000-0000-0000001.svg"
    Then I should see "<svg xmlns"
