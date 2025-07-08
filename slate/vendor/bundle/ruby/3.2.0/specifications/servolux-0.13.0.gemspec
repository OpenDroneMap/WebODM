# -*- encoding: utf-8 -*-
# stub: servolux 0.13.0 ruby lib

Gem::Specification.new do |s|
  s.name = "servolux".freeze
  s.version = "0.13.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Tim Pease".freeze]
  s.date = "2017-03-19"
  s.description = "Serv-O-Lux is a collection of Ruby classes that are useful for daemon and\nprocess management, and for writing your own Ruby services. The code is well\ndocumented and tested. It works with Ruby and JRuby supporting 1.9 and 2.0\ninterpreters.".freeze
  s.email = "tim.pease@gmail.com".freeze
  s.extra_rdoc_files = ["History.txt".freeze]
  s.files = ["History.txt".freeze]
  s.homepage = "http://rubygems.org/gems/servolux".freeze
  s.rdoc_options = ["--main".freeze, "README.md".freeze]
  s.rubygems_version = "3.4.20".freeze
  s.summary = "A collection of tools for working with processes".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_development_dependency(%q<bones-rspec>.freeze, ["~> 2.0"])
  s.add_development_dependency(%q<bones-git>.freeze, ["~> 1.3"])
  s.add_development_dependency(%q<logging>.freeze, ["~> 2.0"])
  s.add_development_dependency(%q<bones>.freeze, [">= 3.8.4"])
end
