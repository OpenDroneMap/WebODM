unless defined? SERVOLUX_SPEC_HELPER
SERVOLUX_SPEC_HELPER = true

require 'rubygems'
require 'logging'
require 'rspec'
require 'rspec/logging_helper'

require File.expand_path('../../lib/servolux', __FILE__)

include Logging.globally

RSpec.configure do |config|
  include RSpec::LoggingHelper
  config.capture_log_messages
end
end  # unless defined?
