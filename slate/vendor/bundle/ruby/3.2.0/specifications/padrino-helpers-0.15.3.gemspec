# -*- encoding: utf-8 -*-
# stub: padrino-helpers 0.15.3 ruby lib

Gem::Specification.new do |s|
  s.name = "padrino-helpers".freeze
  s.version = "0.15.3"

  s.required_rubygems_version = Gem::Requirement.new(">= 1.3.6".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Padrino Team".freeze, "Nathan Esquenazi".freeze, "Davide D'Agostino".freeze, "Arthur Chiu".freeze]
  s.date = "2023-02-25"
  s.description = "Tag helpers, asset helpers, form helpers, form builders and many more helpers for padrino".freeze
  s.email = "padrinorb@gmail.com".freeze
  s.extra_rdoc_files = ["README.rdoc".freeze]
  s.files = ["README.rdoc".freeze]
  s.homepage = "http://www.padrinorb.com".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--charset=UTF-8".freeze]
  s.rubygems_version = "3.4.20".freeze
  s.summary = "Helpers for padrino".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_runtime_dependency(%q<padrino-support>.freeze, ["= 0.15.3"])
  s.add_runtime_dependency(%q<tilt>.freeze, [">= 1.4.1", "< 3"])
  s.add_runtime_dependency(%q<i18n>.freeze, [">= 0.6.7", "< 2"])
end
