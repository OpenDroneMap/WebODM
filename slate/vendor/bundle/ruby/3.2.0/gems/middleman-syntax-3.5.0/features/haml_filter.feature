Feature: Haml :code filter.

  Scenario: Filter works and preserved indentation
    Given a fixture app "test-app"
    And a file named "config.rb" with:
      """
      set :haml, { :ugly => false }
      activate :syntax
      """
    Given the Server is running at "test-app"
    When I go to "/code_haml_filter.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code'

  Scenario: Filter doesn't keep trailing blank lines
    Given a fixture app "test-app"
    And a file named "config.rb" with:
      """
      set :haml, { :ugly => false }
      activate :syntax
      """
    Given the Server is running at "test-app"
    When I go to "/code_haml_filter.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code</code></pre>'
