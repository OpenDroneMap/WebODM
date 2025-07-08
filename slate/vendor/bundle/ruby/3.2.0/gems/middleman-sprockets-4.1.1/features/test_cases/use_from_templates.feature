Feature: Sprockets is available for use in templates

  Scenario: Render a sprockets svg from a template
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path "vendor/images"
      """
    And a file named "vendor/images/logo.svg" with:
      """
      <?xml version="1.0" encoding="iso-8859-1"?>
      """
    And a file named "source/index.html.erb" with:
      """
      <%= sprockets['logo.svg'].source %>
      """
    And the Server is running

    When I go to "/"
    Then I should see '<?xml version="1.0" encoding="iso-8859-1"?>'
