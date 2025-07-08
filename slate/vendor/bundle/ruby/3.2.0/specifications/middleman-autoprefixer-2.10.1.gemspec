# -*- encoding: utf-8 -*-
# stub: middleman-autoprefixer 2.10.1 ruby lib

Gem::Specification.new do |s|
  s.name = "middleman-autoprefixer".freeze
  s.version = "2.10.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Dominik Porada".freeze, "Thomas Reynolds".freeze]
  s.date = "2019-03-09"
  s.email = ["dominik@porada.co".freeze, "me@tdreyno.com".freeze]
  s.homepage = "https://github.com/middleman/middleman-autoprefixer".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "3.4.20".freeze
  s.summary = "Automatically vendor-prefix stylesheets served by Middleman.".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_runtime_dependency(%q<middleman-core>.freeze, [">= 3.3.3"])
  s.add_runtime_dependency(%q<autoprefixer-rails>.freeze, ["~> 9.1"])
  s.add_development_dependency(%q<bundler>.freeze, [">= 1.14"])
  s.add_development_dependency(%q<rake>.freeze, [">= 10.3"])
end
