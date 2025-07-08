Feature: Postprocessing stylesheets with Autoprefixer in different configurations

  Scenario: Using defaults
    Given the Server is running at "default-app"
    When I go to "/stylesheets/page.css"
    Then I should not see "-ms-border-radius"
    And I should see "border-radius"
    When I go to "/index.html"
    Then I should see "-ms-border-radius"

  Scenario: Passing options in a block
    Given the Server is running at "block-app"
    When I go to "/stylesheets/page.css"
    Then I should see "-webkit-linear-gradient"
    And I should see "-moz-linear-gradient"

  Scenario: Passing options in a hash
    Given the Server is running at "hash-app"
    When I go to "/stylesheets/page.css"
    Then I should see "-webkit-transition"
    And I should not see "-moz-transition"

  Scenario: Adding is off
    Given the Server is running at "adding-off-app"
    When I go to "/stylesheets/page.css"
    Then I should not see "-webkit-transition"
    And I should not see "-moz-transition"

  Scenario: Removing is off
    Given the Server is running at "removing-off-app"
    When I go to "/stylesheets/page.css"
    Then I should see "-webkit-transition"
    And I should see "-moz-transition"

  Scenario: Cascading is on
    Given the Server is running at "cascading-on-app"
    When I go to "/stylesheets/page.css"
    Then I should see:
      """
        -webkit-box-sizing: border-box;
           -moz-box-sizing: border-box;
                box-sizing: border-box;
      """

  Scenario: Cascading is off
    Given the Server is running at "cascading-off-app"
    When I go to "/stylesheets/page.css"
    Then I should see:
      """
        -webkit-box-sizing: border-box;
           -moz-box-sizing: border-box;
                box-sizing: border-box;
      """

  Scenario: Inline HTML
    Given the Server is running at "inline-app"
    When I go to "/index.html"
    Then I should not see "-ms-border-radius"
    And I should see "border-radius"

  Scenario: Ignoring paths
    Given the Server is running at "ignore-app"
    When I go to "/stylesheets/yep-1.css"
    Then I should see "-ms-border-radius"
    When I go to "/stylesheets/yep-2.css"
    Then I should see "-ms-border-radius"
    When I go to "/stylesheets/nope.css"
    Then I should not see "-ms-border-radius"
    And I should see "border-radius"

  Scenario: With arbitrary proxy paths
    Given the Server is running at "proxy-app"
    When I go to "/proxy"
    Then I should not see "-ms-border-radius"
    And I should see "border-radius"
    When I go to "/proxy-inline"
    Then I should not see "-ms-border-radius"
    And I should see "border-radius"
