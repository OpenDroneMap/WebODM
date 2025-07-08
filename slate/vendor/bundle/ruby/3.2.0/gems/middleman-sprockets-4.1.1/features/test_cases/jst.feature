Feature: Sprockets JST & EJS

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/javascripts/templates.js" with:
      """
      //= require_tree "./_templates"
      """
    And a file named "source/javascripts/_templates/test.jst.ejs" with:
      """
      <%= 'hello' %>
      """
    And a file named "source/javascripts/_templates/test2.jst.eco" with:
      """
      <%= 'world' %>
      """

  Scenario: Serving .ejs & .eco
    Given the Server is running

    When I go to "/javascripts/templates.js"
    Then I should see '["_templates/test"] = function'
    And I should see '["_templates/test2"] = function'


  Scenario: Building .ejs & .eco
    Given a successfully built app

    When I cd to "build"
    Then a file named "javascripts/templates.js" should exist
    And the file "javascripts/templates.js" should contain '["_templates/test"] = function'
    And the file "javascripts/templates.js" should contain '["_templates/test2"] = function'
