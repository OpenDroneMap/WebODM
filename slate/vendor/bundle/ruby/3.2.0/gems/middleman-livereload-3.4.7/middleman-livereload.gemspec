# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require "middleman-livereload/version"

Gem::Specification.new do |s|
  s.name = "middleman-livereload"
  s.version = Middleman::LiveReload::VERSION
  s.platform = Gem::Platform::RUBY
  s.authors     = ["Thomas Reynolds", "Ben Hollis", "Karl Freeman"]
  s.email       = ["me@tdreyno.com", "ben@benhollis.net", "karlfreeman@gmail.com"]
  s.homepage = "https://github.com/middleman/middleman-livereload"
  s.summary = %q{LiveReload support for Middleman}
  s.description = %q{LiveReload support for Middleman}
  s.license = "MIT"
  s.files = `git ls-files -z`.split("\0")
  s.test_files = `git ls-files -z -- {fixtures,features}/*`.split("\0")
  s.require_paths = ["lib"]
  s.required_ruby_version = '>= 1.9.3'
  s.add_dependency("middleman-core", [">= 3.3"])
  s.add_runtime_dependency('rack-livereload', ['~> 0.3.15'])
  s.add_runtime_dependency('em-websocket', ['~> 0.5.1'])
end
