# -*- encoding: utf-8 -*-
# stub: temple 0.10.3 ruby lib

Gem::Specification.new do |s|
  s.name = "temple".freeze
  s.version = "0.10.3"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Magnus Holm".freeze, "Daniel Mendler".freeze]
  s.date = "2023-10-03"
  s.email = ["judofyr@gmail.com".freeze, "mail@daniel-mendler.de".freeze]
  s.homepage = "https://github.com/judofyr/temple".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.5.0".freeze)
  s.rubygems_version = "3.4.20".freeze
  s.summary = "Template compilation framework in Ruby".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_development_dependency(%q<tilt>.freeze, [">= 0"])
  s.add_development_dependency(%q<rspec>.freeze, [">= 0"])
  s.add_development_dependency(%q<rake>.freeze, [">= 0"])
  s.add_development_dependency(%q<erubi>.freeze, [">= 0"])
end
