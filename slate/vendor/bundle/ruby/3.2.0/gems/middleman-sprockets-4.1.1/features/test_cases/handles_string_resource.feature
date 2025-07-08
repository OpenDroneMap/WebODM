Feature: Sitemaps that include StringResource

  Scenario: No exception is raised determining if the resource is processible
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      class StringResourceGenerator < Middleman::Extension
        def manipulate_resource_list resources
          resources + [Middleman::Sitemap::StringResource.new(app.sitemap, 'stringy/index.html', 'Stringy!')]
        end
      end

      ::Middleman::Extensions.register(:stringy, StringResourceGenerator)

      activate :stringy
      activate :sprockets
      """
    And the Server is running

    When I go to "/stringy"
    Then I should see "Stringy!"

