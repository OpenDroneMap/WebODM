Feature: Processible assets outside js_dir or css_dir still compile

  Scenario: Can process css & js outside the js_dir or css_dir
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/root.js.coffee" with:
      """
      console.log 'root'
      """
    And a file named "source/dir/nested.js.coffee" with:
      """
      console.log 'nested'
      """
    And a file named "source/root.css.scss" with:
      """
      body {
        content: 'root';
      }
      """
    And a file named "source/dir/nested.css.scss" with:
      """
      body {
        content: 'nested';
      }
      """
    And the Server is running

    When I go to "/root.js"
    Then I should see "console.log('root');"

    When I go to "/dir/nested.js"
    Then I should see "console.log('nested');"

    When I go to "/root.css"
    Then I should see:
      """
      body {
        content: 'root'; }
      """

    When I go to "/dir/nested.css"
    Then I should see:
      """
      body {
        content: 'nested'; }
      """
