ENV['RACK_ENV'] = 'test'
PADRINO_ROOT = File.dirname(__FILE__) unless defined?(PADRINO_ROOT)

require 'minitest/autorun'
require 'minitest/pride'
require 'padrino-support'
require 'padrino-core/logger'
