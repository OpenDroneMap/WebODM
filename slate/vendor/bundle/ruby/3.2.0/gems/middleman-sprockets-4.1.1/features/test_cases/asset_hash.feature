Feature: Assets get a file hash appended to their URL and references to them are updated

  @asset_hash
  Scenario: Hashed-asset files are produced, and HTML, CSS, and JavaScript gets rewritten to reference the new files
    Given a successfully built app at "asset-hash-app"
    When I cd to "build"
    Then the following files should exist:
      | index.html |
      | images/100px-1242c368.png |
      | images/100px-5fd6fb90.jpg |
      | images/100px-5fd6fb90.gif |
      | javascripts/application-df677242.js |
      | stylesheets/site-2f4798cc.css |
      | index.html |
      | subdir/index.html |
      | other/index.html |
    And the following files should not exist:
      | images/100px.png |
      | images/100px.jpg |
      | images/100px.gif |
      | javascripts/application.js |
      | stylesheets/site.css |

    And the file "javascripts/application-df677242.js" should contain "img.src = '/images/100px-5fd6fb90.jpg'"
    And the file "stylesheets/site-2f4798cc.css" should contain 'background-image: url(../images/100px-5fd6fb90.jpg)'
    And the file "index.html" should contain 'href="stylesheets/site-2f4798cc.css"'
    And the file "index.html" should contain 'src="javascripts/application-df677242.js"'
    And the file "index.html" should contain 'src="images/100px-5fd6fb90.jpg"'
    And the file "subdir/index.html" should contain 'href="../stylesheets/site-2f4798cc.css"'
    And the file "subdir/index.html" should contain 'src="../javascripts/application-df677242.js"'
    And the file "subdir/index.html" should contain 'src="../images/100px-5fd6fb90.jpg"'
    And the file "other/index.html" should contain 'href="../stylesheets/site-2f4798cc.css"'
    And the file "other/index.html" should contain 'src="../javascripts/application-df677242.js"'
    And the file "other/index.html" should contain 'src="../images/100px-5fd6fb90.jpg"'

  @asset_hash
  Scenario: Hashed assets work in preview server
    Given the Server is running at "asset-hash-app"
    When I go to "/"
    Then I should see 'href="stylesheets/site-2f4798cc.css"'
    Then I should see 'href="stylesheets/jquery-mobile-08069726.css"'
    And I should see 'src="javascripts/application-df677242.js"'
    And I should see 'src="images/100px-5fd6fb90.jpg"'
    When I go to "/subdir/"
    Then I should see 'href="../stylesheets/site-2f4798cc.css"'
    And I should see 'src="../javascripts/application-df677242.js"'
    And I should see 'src="../images/100px-5fd6fb90.jpg"'
    When I go to "/other/"
    Then I should see 'href="../stylesheets/site-2f4798cc.css"'
    And I should see 'src="../javascripts/application-df677242.js"'
    And I should see 'src="../images/100px-5fd6fb90.jpg"'
    When I go to "/javascripts/application-df677242.js"
    Then I should see "img.src = '/images/100px-5fd6fb90.jpg'"
    When I go to "/stylesheets/site-2f4798cc.css"
    Then I should see 'background-image: url(../images/100px-5fd6fb90.jpg)'
    When I go to "/stylesheets/jquery-mobile-08069726.css"
    Then I should see 'background-image: url(../assets/jquery-mobile/icons-png/action-white-06d3eb76.png)'

  @asset_hash
  Scenario: Enabling an asset host still produces hashed files and references
    Given the Server is running at "asset-hash-host-app"
    When I go to "/"
    Then I should see 'href="http://middlemanapp.com/stylesheets/site-2f4798cc.css"'
    And I should see 'src="http://middlemanapp.com/images/100px-5fd6fb90.jpg"'
    When I go to "/subdir/"
    Then I should see 'href="http://middlemanapp.com/stylesheets/site-2f4798cc.css"'
    And I should see 'src="http://middlemanapp.com/images/100px-5fd6fb90.jpg"'
    When I go to "/other/"
    Then I should see 'href="http://middlemanapp.com/stylesheets/site-2f4798cc.css"'
    And I should see 'src="http://middlemanapp.com/images/100px-5fd6fb90.jpg"'
    When I go to "/stylesheets/site-2f4798cc.css"
    Then I should see 'background-image: url(http://middlemanapp.com/images/100px-5fd6fb90.jpg)'

  @asset_hash
  Scenario: The asset hash should change when a SASS partial changes
    Given the Server is running at "asset-hash-app"
    And the file "source/stylesheets/_partial.sass" has the contents
      """
      body
        font-size: 14px
      """
    When I go to "/partials/"
    Then I should see 'href="../stylesheets/uses_partials-423a00f7.css'
    And wait a second
    And the file "source/stylesheets/_partial.sass" has the contents
      """
      body
        font-size: 18px !important
      """
    When I go to "/partials/"
    Then I should see 'href="../stylesheets/uses_partials-e8c3d4eb.css'

  @asset_hash
  Scenario: The asset hash should change when a Javascript partial changes
    Given the Server is running at "asset-hash-app"
    And the file "source/javascripts/sprockets_sub.js" has the contents
      """
      function sprockets_sub_function() { }
      """
    When I go to "/partials/"
    Then I should see 'src="../javascripts/sprockets_base-0252a861.js'
    When I go to "/javascripts/sprockets_base-0252a861.js"
    Then I should see "sprockets_sub_function"
    And wait a second
    And the file "source/javascripts/sprockets_sub.js" has the contents
      """
      function sprockets_sub2_function() { }
      """
    When I go to "/partials/"
    Then I should see 'src="../javascripts/sprockets_base-5121d891.js'
    When I go to "/javascripts/sprockets_base-5121d891.js"
    Then I should see "sprockets_sub2_function"
