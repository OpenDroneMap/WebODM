Feature: Code blocks with line numbers in markdown
  @nojava
  Scenario: Line numbers enabled with Redcarpet
    Given a fixture app "test-app"
    And a file named "config.rb" with:
      """
      set :markdown_engine, :redcarpet
      set :markdown, :fenced_code_blocks => true
      activate :syntax, :line_numbers => true
      """
    Given the Server is running at "test-app"
    When I go to "/code_with_enabled_line_numbers.html"
    Then I should see '<pre class="lineno">'
