Feature: Access to Middleman helpers

  Sprockets is given an `asset_path` helper that is able to use the Middleman sitemap. This allows Sprockets methods like `image-url` to work for Middleman assets.

  By default helpers other than asset_path that are added to Middleman aren't available in Sprockets' rendering context. They can, however, be added through a configuration option. There is a caveat though that `current_resource` is unavailable so look out for helpers that depend on it.

  Scenario: Using asset_path to link to a Middleman asset
    Here we're depending on the behavior of `image-url` to call asset_path internally

    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      set :http_prefix, '/winterfell'
      """
    And a file named "source/images/img.svg" with:
      """
      <?xml version="1.0" encoding="iso-8859-1"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 20001102//EN"
       "http://www.w3.org/TR/2000/CR-SVG-20001102/DTD/svg-20001102.dtd">
      <svg width="100%" height="100%">
        <g transform="translate(50,50)">
          <rect x="0" y="0" width="150" height="50" style="fill:red;" />
        </g>
      </svg>
      """
    And a file named "source/stylesheets/site.css.scss" with:
      """
      body {
        background: image-url('img.svg');
      }
      """
    And the Server is running

    When I go to "/stylesheets/site.css"
    Then I should see:
      """
      body {
        background: url(/winterfell/images/img.svg); }
      """

  Scenario: Sprockets has access to Middleman data
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "data/test.yml" with:
      """
      foo: bar
      """
    And a file named "source/javascripts/data_accessor.js.coffee.erb" with:
      """
      console.log '<%= data.test.foo %>'
      """
    And the Server is running

    When I go to "/javascripts/data_accessor.js"
    Then I should see "console.log('bar')"

  Scenario: Using a helper from a Sprockets asset
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets do |c|
        c.expose_middleman_helpers = true
      end

      helpers do
        def hello
          'hello'
        end
      end
      """
    And a file named "source/index.html.erb" with:
      """
      <h1><%= hello %></h1>
      """
    And a file named "source/javascripts/site.js.erb" with:
      """
      console.log('<%= hello %>');
      """
    And a file named "vendor/javascripts/imported.js.erb" with:
      """
      console.log('<%= hello %>');
      """
    And a file named "source/javascripts/importer.js" with:
      """
      //= require imported
      """
    And the Server is running

    When I go to "/index.html"
    Then I should see "<h1>hello</h1>"

    When I go to "/javascripts/site.js"
    Then I should see "console.log('hello');"

    When I go to "/javascripts/importer.js"
    Then I should see "console.log('hello');"


  Scenario: current_resource is available
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      """
    And a file named "source/index.html.erb" with:
      """
      <pre><%= current_resource.url %></pre>
      """
    And a file named "source/javascripts/site.js.erb" with:
      """
      console.log('<%= current_resource.url %>');
      """
    And the Server is running

    When I go to "/index.html"
    Then I should see "<pre>/</pre>"

    When going to "/javascripts/site.js" should not raise an exception
    And I should see "console.log('/javascripts/site.js');"


  Scenario: Helpers are not included by default
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets

      helpers do
        def hello
          'hello'
        end
      end
      """
    And a file named "source/index.html.erb" with:
      """
      <h1><%= hello %></h1>
      """
    And a file named "source/javascripts/site.js.erb" with:
      """
      console.log('<%= hello %>');
      """
    And the Server is running

    When I go to "/index.html"
    Then I should see "<h1>hello</h1>"

    When going to "/javascripts/site.js" should not raise an exception
    Then I should see "undefined local variable or method `hello'"
