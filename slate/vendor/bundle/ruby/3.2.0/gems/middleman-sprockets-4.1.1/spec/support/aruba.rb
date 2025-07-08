# encoding: utf-8
require 'aruba/api'

module Middleman
  module Sprockets
    module SpecHelper
      include ::Aruba::Api
    end
  end
end

RSpec.configure do |config|
  config.before(:each) do
    clean_current_dir
  end

  config.include Middleman::Sprockets::SpecHelper
end
