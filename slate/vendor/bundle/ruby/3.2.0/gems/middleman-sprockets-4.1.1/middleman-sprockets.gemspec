# -*- encoding: utf-8 -*-
$LOAD_PATH.push File.expand_path('../lib', __FILE__)
require 'middleman-sprockets/version'

Gem::Specification.new do |s|
  s.name        = 'middleman-sprockets'
  s.version     = Middleman::Sprockets::VERSION
  s.platform    = Gem::Platform::RUBY
  s.authors     = ['Thomas Reynolds', 'Ben Hollis', 'Karl Freeman']
  s.email       = ['me@tdreyno.com', 'ben@benhollis.net', 'karlfreeman@gmail.com']
  s.homepage    = 'https://github.com/middleman/middleman-sprockets'
  s.summary     = 'Sprockets support for Middleman'
  s.description = 'Sprockets support for Middleman'
  s.license     = 'MIT'
  s.files       = `git ls-files -z`.split("\0")
  s.test_files  = `git ls-files -z -- {fixtures,features}/*`.split("\0")
  s.require_paths = ['lib']

  s.add_dependency 'middleman-core', ['~> 4.0']
  s.add_dependency 'sprockets',      ['>= 3.0']

  s.add_development_dependency 'capybara', ['~> 2.5.0']
end
