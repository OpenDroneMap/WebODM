# frozen_string_literal: true

require File.expand_path("boot", __dir__)

require "action_controller/railtie"
require "sprockets/railtie"

Bundler.require(*Rails.groups(assets: %w[development test])) if defined?(Bundler)

module App
  class Application < Rails::Application
    config.assets.enabled = true
    config.sass.line_comments = false
    config.sass.inline_source_maps = true
  end
end
