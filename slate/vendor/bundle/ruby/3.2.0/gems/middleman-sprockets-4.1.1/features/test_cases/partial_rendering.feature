Feature: Partials can be rendered from a Sprockets Asset

  Scenario: Rendering a partial in a file in source
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets do |c|
        c.expose_middleman_helpers = true
      end
      """
    And a file named "source/partials/_maybe_a_js_template.mustache.erb" with:
      """
      <h1>{{ hello }}</h1>
      """
    And a file named "source/javascripts/main.js.erb" with:
      """
      var template = "<%= partial 'partials/maybe_a_js_template.mustache' %>";
      """
    And the Server is running

    When I go to "/javascripts/main.js"
    Then I should see "<h1>{{ hello }}</h1>"

  @middleman_head
  Scenario: Rendering a partial in a required file outside source
    This is only possible in middleman 4.1.9+

    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets do |c|
        c.expose_middleman_helpers = true
      end
      """
    And a file named "source/partials/_template.mustache.erb" with:
      """
      <h1>{{ hello }}</h1>
      """
    And a file named "source/javascripts/_template.js.erb" with:
      """
      var template = "<%= partial 'partials/template.mustache' %>";
      """
    And a file named "source/javascripts/main.js" with:
      """
      //= require '_template'
      """
    And the Server is running

    When I go to "/javascripts/main.js"
    Then I should see "<h1>{{ hello }}</h1>"
