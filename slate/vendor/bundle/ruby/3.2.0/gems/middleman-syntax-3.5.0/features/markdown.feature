Feature: Code blocks in markdown get highlighted

  Scenario: Works with Kramdown
    Given a fixture app "test-app"
    And a file named "config.rb" with:
      """
      set :markdown_engine, :kramdown
      activate :syntax
      """
    Given the Server is running at "test-app"
    When I go to "/code.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code'

  @nojava
  Scenario: Works with RedCarpet
    Given a fixture app "test-app"
    And a file named "config.rb" with:
      """
      set :markdown_engine, :redcarpet
      set :markdown, :fenced_code_blocks => true
      activate :syntax
      """
    Given the Server is running at "test-app"
    When I go to "/code.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code'
