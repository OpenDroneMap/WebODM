PROJECT_ROOT_PATH = File.dirname(File.dirname(File.dirname(__FILE__)))
ENV['TEST'] = 'true'

require 'coveralls'
Coveralls.wear!

require 'middleman'
require 'middleman-core/step_definitions'
require File.join(PROJECT_ROOT_PATH, 'lib', 'middleman-autoprefixer')
