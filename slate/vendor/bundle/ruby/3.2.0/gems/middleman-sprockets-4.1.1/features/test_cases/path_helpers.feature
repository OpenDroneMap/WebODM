Feature: Link helpers work in Sprockets & Middleman for sprockets or middleman assets

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets do |c|
        c.imported_asset_path = "sprockets"
      end
      """
    And a file named "vendor/js/one.js" with:
      """
      console.log('one')
      """
    And a file named "vendor/js/two.js.coffee" with:
      """
      console.log('two')
      """
    And a file named "vendor/js/three.js.erb" with:
      """
      console.log('three')
      """
    And a file named "vendor/js/four.js.coffee.erb" with:
      """
      console.log('four')
      """
    And a file named "vendor/css/one.css" with:
      """
      .one { color: inherit; }
      """
    And a file named "vendor/css/two.css.sass" with:
      """
      .two
        color: inherit
      """
    And a file named "vendor/css/three.css.scss" with:
      """
      .three { color: inherit; }
      """
    And a file named "vendor/css/four.css.erb" with:
      """
      .four { color: inherit; }
      """
    And a file named "vendor/css/five.css.sass.erb" with:
      """
      .five
        color: inherit
      """
    And a file named "vendor/css/six.css.scss.erb" with:
      """
      .six { color: inherit; }
      """

    And a file named "source/links.html.erb" with:
      """
      <h2>JS Links</h2>
      one:   "<%= javascript_path('one') %>"
      two:   "<%= javascript_path('two') %>"
      three: "<%= javascript_path('three') %>"
      four:  "<%= javascript_path('four') %>"

      <h2>CSS Links</h2>
      one:   "<%= stylesheet_path('one') %>"
      two:   "<%= stylesheet_path('two') %>"
      three: "<%= stylesheet_path('three') %>"
      four:  "<%= stylesheet_path('four') %>"
      five:  "<%= stylesheet_path('five') %>"
      six:   "<%= stylesheet_path('six') %>"
      """


  Scenario: Link helpers work in a sprockets asset
    Given a file named "source/javascripts/links.js.erb" with:
      """
      var js_links = {
        one: "<%= javascript_path('one') %>",
        two: "<%= javascript_path('two') %>",
        three: "<%= javascript_path('three') %>",
        four: "<%= javascript_path('four') %>",
      }

      var css_links = {
        one: "<%= stylesheet_path('one') %>",
        two: "<%= stylesheet_path('two') %>",
        three: "<%= stylesheet_path('three') %>",
        four: "<%= stylesheet_path('four') %>",
        five: "<%= stylesheet_path('five') %>",
        six: "<%= stylesheet_path('six') %>"
      }
      """
    And the Server is running

    When I go to "/javascripts/links.js"
    Then I should see 'one: "/sprockets/one.js'
    And I should see 'two: "/sprockets/two.js'
    And I should see 'three: "/sprockets/three.js'
    And I should see 'four: "/sprockets/four.js'
    And I should see 'one: "/sprockets/one.css'
    And I should see 'two: "/sprockets/two.css'
    And I should see 'three: "/sprockets/three.css'
    And I should see 'four: "/sprockets/four.css'
    And I should see 'five: "/sprockets/five.css'
    And I should see 'six: "/sprockets/six.css'



