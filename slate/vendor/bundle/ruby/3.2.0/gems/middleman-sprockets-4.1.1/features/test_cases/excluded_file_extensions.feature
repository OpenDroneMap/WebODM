Feature: Files with unhandled file extensions are ignored
  We should be able to handle having files in one of the sprockets directories that sprockets can't process without blowing up.

  Background:
    Given a fixture app "base-app"


  Scenario: Dotfiles in js_dir are handled by middleman only
    Given a file named "source/library/js/.jslintrc" with:
      """
      {"bitwise":true}
      """
    And the Server is running

    When I go to "/library/js/.jslintrc"
    Then I should see '{"bitwise":true}'


  Scenario: Files that output as HTML in js_dir aren't handled by Sprockets
    Given a file named "source/library/js/index.html.erb" with:
      """
      <h1><%= current_resource.url %></h1>
      """
    And the Server is running

    When I go to "/library/js"
    Then I should see "<h1>/library/js/</h1>"


  Scenario: Files with Tilt templates, but not supported by sprockets, are handled properly
    Given a file named "source/library/js/index.js.haml" with:
      """
      :plain
        alert('why haml?');
      """
    And the Server is running

    When I go to "/library/js/index.js"
    Then I should see "alert('why haml?');"

Scenario: Json files should be ignored for sprockets 4
  Given a file named "source/file.json.coffee" with:
    """
    data:
      title: "file"
    """
  And the Server is running

  When I go to "/file.json"
  Then I should see 'title: "file"'
