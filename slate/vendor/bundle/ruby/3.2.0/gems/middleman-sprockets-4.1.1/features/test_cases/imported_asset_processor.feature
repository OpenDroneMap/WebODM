Feature: Imported assets can be placed in paths determined by a processor

  Background:
    Given a fixture app "base-app"
    And a file named "config.rb" with:
      """
      config[:images_dir] = "images"
      config[:fonts_dir]  = "fonts"

      class ImportedAssetPathProcessor
        attr_reader :app

        def initialize(app)
          @app = app
        end

        def call(sprockets_asset)
          directory = case sprockets_asset.logical_path
                      when /^images\// then app.config[:images_dir]
                      when /^fonts\// then app.config[:fonts_dir]
                      else
                        "imported"
                      end
          relative_path = sprockets_asset.logical_path.sub(/^#{directory}/, '')
          File.join(directory, relative_path)
        end
      end

      activate :sprockets do |config|
        config.imported_asset_path = ImportedAssetPathProcessor.new(app)
      end
      sprockets.append_path File.join(root, 'vendor')
      """
    And a file named "vendor/fonts/webfont-vendor.eot" with:
      """
      """
    And a file named "vendor/images/vendor-image.jpg" with:
      """
      """
    And a file named "vendor/foo/bar.jpg" with:
      """
      """
    And a file named "source/fonts/webfont-source.eot" with:
      """
      """
    And a file named "source/images/source-image.jpg" with:
      """
      """


  Scenario: Assets built by being linked (fully resolved) are built in the custom path
    Given a file named "source/stylesheets/manifest.css" with:
      """
      //= link 'webfont-vendor.eot'
      //= link 'vendor-image.jpg'
      //= link 'foo/bar.jpg'
      """
    And the Server is running

    When I go to "/fonts/webfont-vendor.eot"
    Then the status code should be "200"
    When I go to "/fonts/webfont-source.eot"
    Then the status code should be "200"
    When I go to "/images/vendor-image.jpg"
    Then the status code should be "200"
    When I go to "/images/source-image.jpg"
    Then the status code should be "200"
    When I go to "/imported/foo/bar.jpg"
    Then the status code should be "200"

  Scenario: Assets built by being linked (minimally resolved) are built in the custom path
    Given a file named "source/stylesheets/manifest.css" with:
      """
      //= link 'fonts/webfont-vendor.eot'
      //= link 'images/vendor-image.jpg'
      //= link 'foo/bar.jpg'
      """
    And the Server is running

    When I go to "/fonts/webfont-vendor.eot"
    Then the status code should be "200"
    When I go to "/fonts/webfont-source.eot"
    Then the status code should be "200"
    When I go to "/images/vendor-image.jpg"
    Then the status code should be "200"
    When I go to "/images/source-image.jpg"
    Then the status code should be "200"
    When I go to "/imported/foo/bar.jpg"
    Then the status code should be "200"
