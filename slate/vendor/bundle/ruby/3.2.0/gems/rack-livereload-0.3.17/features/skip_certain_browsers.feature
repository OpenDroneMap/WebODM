Feature: Skip Certain Browsers
  Scenario Outline:
    Given I have a Rack app with Rack::LiveReload
    When I make a request to "/" with the following headers:
      | HTTP_USER_AGENT | <user agent> |
    Then I should not have any Rack::LiveReload code

  Scenarios: Browsers to check for
    | user agent |
    | MSIE |

