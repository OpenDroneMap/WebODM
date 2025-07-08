Feature: Imported assets are built with the correct extensions

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      activate :sprockets
      sprockets.append_path File.join(root, 'vendor')
      """
    And a file named "vendor/fonts/webfont-vendor.svg" with:
      """
      """
    And a file named "vendor/fonts/webfont-vendor.svg.gz" with:
      """
      """
    And a file named "vendor/fonts/webfont-vendor.ttf.gz" with:
      """
      """
    And a file named "source/fonts/webfont-source.svg" with:
      """
      """
    And a file named "source/fonts/webfont-source.svg.gz" with:
      """
      """
    And a file named "source/fonts/webfont-source.ttf.gz" with:
      """
      """
    And a file named "vendor/images/drawing-vendor.svg" with:
      """
      """
    And a file named "source/images/drawing-source.svg" with:
      """
      """
    And a file named "vendor/images/extensions-source.svg.gz" with:
      """
      """
    And a file named "vendor/images/extensions-source.min.js" with:
      """
      """
    And a file named "vendor/images/extensions-source.asdf.asdf.min.js.asdf" with:
      """
      """


  Scenario: Assets built by being linked are built with the right extension
    Given a file named "source/stylesheets/manifest.css" with:
      """
      //= link 'fonts/webfont-vendor.svg'
      //= link 'fonts/webfont-vendor.svg.gz'
      //= link 'fonts/webfont-vendor.ttf.gz'
      //= link 'images/drawing-vendor.svg'
      //= link 'images/extensions-source.svg.gz'
      //= link 'images/extensions-source.min.js'
      //= link 'images/extensions-source.asdf.asdf.min.js.asdf'
      """
    And a successfully built app

    When I cd to "build"
    Then the following files should exist:
      | assets/fonts/webfont-vendor.svg |
      | assets/fonts/webfont-vendor.svg.gz |
      | assets/fonts/webfont-vendor.ttf.gz |
      | assets/images/drawing-vendor.svg |
      | assets/images/extensions-source.svg.gz |
      | assets/images/extensions-source.min.js |
      | assets/images/extensions-source.asdf.asdf.min.js.asdf |

  Scenario: Assets in source don't have their extensions mangled
    Given a successfully built app

    When I cd to "build"
    Then the following files should exist:
      | fonts/webfont-source.svg |
      | fonts/webfont-source.svg.gz |
      | fonts/webfont-source.ttf.gz |
      | images/drawing-source.svg |

