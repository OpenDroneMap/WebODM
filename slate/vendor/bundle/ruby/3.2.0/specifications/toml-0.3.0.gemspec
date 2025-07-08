# -*- encoding: utf-8 -*-
# stub: toml 0.3.0 ruby lib

Gem::Specification.new do |s|
  s.name = "toml".freeze
  s.version = "0.3.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Jeremy McAnally".freeze, "Dirk Gadsden".freeze]
  s.date = "2021-06-01"
  s.description = "Parse your TOML, seriously.".freeze
  s.email = "jeremy@github.com".freeze
  s.extra_rdoc_files = ["README.md".freeze, "LICENSE".freeze, "CHANGELOG.md".freeze]
  s.files = ["CHANGELOG.md".freeze, "LICENSE".freeze, "README.md".freeze]
  s.homepage = "http://github.com/jm/toml".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--charset=UTF-8".freeze]
  s.rubygems_version = "3.4.20".freeze
  s.summary = "Parse your TOML.".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 2

  s.add_runtime_dependency(%q<parslet>.freeze, [">= 1.8.0", "< 3.0.0"])
  s.add_development_dependency(%q<rake>.freeze, [">= 0"])
end
