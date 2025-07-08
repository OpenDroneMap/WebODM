Feature: Extra css classes for the pre tag

  Scenario: Extra css classes from configuration
    Given a fixture app "test-app-extra-css-classes"
    And a file named "config.rb" with:
      """
      activate :syntax, :extra_css_classes => ["custom-class", "another-class"]
      """
    And a file named "source/index.html.erb" with:
      """
      <% code("ruby") do %>
      def my_method
        puts "Hello"
      end
      <% end %>
      """
    And the Server is running
    When I go to "/index.html"
    Then I should see '<pre class="highlight ruby custom-class another-class"><code>'

  Scenario: Extra css classes as a string
    Given a fixture app "test-app-extra-css-classes"
    And a file named "config.rb" with:
      """
      activate :syntax, :extra_css_classes => "custom-class another-class"
      """
    And a file named "source/index.html.erb" with:
      """
      <% code("ruby") do %>
      def my_method
        puts "Hello"
      end
      <% end %>
      """
    And the Server is running
    When I go to "/index.html"
    Then I should see '<pre class="highlight ruby custom-class another-class"><code>'

  Scenario: Extra css classes via helper options
    Given a fixture app "test-app-extra-css-classes"
    And a file named "config.rb" with:
      """
      activate :syntax
      """
    And a file named "source/index.html.erb" with:
      """
      <% code("ruby", :extra_css_classes => ["helper-class", "another-helper-class"]) do %>
      def my_method
        puts "Hello"
      end
      <% end %>
      """
    And the Server is running
    When I go to "/index.html"
    Then I should see '<pre class="highlight ruby helper-class another-helper-class"><code>' 