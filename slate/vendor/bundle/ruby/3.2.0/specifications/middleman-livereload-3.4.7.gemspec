# -*- encoding: utf-8 -*-
# stub: middleman-livereload 3.4.7 ruby lib

Gem::Specification.new do |s|
  s.name = "middleman-livereload".freeze
  s.version = "3.4.7"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Thomas Reynolds".freeze, "Ben Hollis".freeze, "Karl Freeman".freeze]
  s.date = "2021-04-08"
  s.description = "LiveReload support for Middleman".freeze
  s.email = ["me@tdreyno.com".freeze, "ben@benhollis.net".freeze, "karlfreeman@gmail.com".freeze]
  s.homepage = "https://github.com/middleman/middleman-livereload".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.3".freeze)
  s.rubygems_version = "3.4.20".freeze
  s.summary = "LiveReload support for Middleman".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_runtime_dependency(%q<middleman-core>.freeze, [">= 3.3"])
  s.add_runtime_dependency(%q<rack-livereload>.freeze, ["~> 0.3.15"])
  s.add_runtime_dependency(%q<em-websocket>.freeze, ["~> 0.5.1"])
end
