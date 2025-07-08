Feature: Syntax highlighting with the "code" helper method

  Scenario: Works from ERb
    Given the Server is running at "test-app"
    When I go to "/code_html.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code'

  Scenario: Works from Haml
    Given the Server is running at "test-app"
    When I go to "/code_haml.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code'

  Scenario: Works from Slim
    Given the Server is running at "test-app"
    When I go to "/code_slim.html"
    Then I should see '<span class="k">def</span>'
    Then I should see '<pre class="highlight plaintext"><code>This is some code'

  Scenario: options start_line works from erb
    Given the Server is running at "test-app"
    When I go to "/code_html.html"
    Then I should see '<pre class="lineno">7'

  Scenario: options start_line works from Haml
    Given the Server is running at "test-app"
    When I go to "/code_haml.html"
    Then I should see '<pre class="lineno">7'

  Scenario: options start_line works from Slim
    Given the Server is running at "test-app"
    When I go to "/code_slim.html"
    Then I should see '<pre class="lineno">7'