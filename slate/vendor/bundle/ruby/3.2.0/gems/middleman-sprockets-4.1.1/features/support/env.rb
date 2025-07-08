PROJECT_ROOT_PATH = File.dirname(File.dirname(File.dirname(__FILE__)))

require 'simplecov'
SimpleCov.command_name 'cucumber'
SimpleCov.start

# Pull in all of the gems including those in the `test` group
require 'bundler'
Bundler.require :default, :test, :development

ENV['TEST'] = 'true'
ENV['AUTOLOAD_SPROCKETS'] = 'true'

require 'middleman-core'
require 'middleman-core/step_definitions'
require File.join(PROJECT_ROOT_PATH, 'lib', 'middleman-sprockets')
require 'erubis'
