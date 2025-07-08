# frozen_string_literal: true

require "aruba/cucumber"
require "aruba/jruby" if RUBY_PLATFORM == "java"

Before do
  @aruba_timeout_seconds = RUBY_PLATFORM == "java" ? 30 : 5
end
