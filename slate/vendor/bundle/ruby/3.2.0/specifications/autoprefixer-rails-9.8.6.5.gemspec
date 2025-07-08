# -*- encoding: utf-8 -*-
# stub: autoprefixer-rails 9.8.6.5 ruby lib

Gem::Specification.new do |s|
  s.name = "autoprefixer-rails".freeze
  s.version = "9.8.6.5"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "bug_tracker_uri" => "https://github.com/ai/autoprefixer-rails/issues", "changelog_uri" => "https://github.com/ai/autoprefixer-rails/blob/master/CHANGELOG.md", "source_code_uri" => "https://github.com/ai/autoprefixer-rails" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Andrey Sitnik".freeze]
  s.date = "2020-09-16"
  s.email = "andrey@sitnik.ru".freeze
  s.extra_rdoc_files = ["README.md".freeze, "LICENSE".freeze, "CHANGELOG.md".freeze]
  s.files = ["CHANGELOG.md".freeze, "LICENSE".freeze, "README.md".freeze]
  s.homepage = "https://github.com/ai/autoprefixer-rails".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.4".freeze)
  s.rubygems_version = "3.4.20".freeze
  s.summary = "Parse CSS and add vendor prefixes to CSS rules using values from the Can I Use website.".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_runtime_dependency(%q<execjs>.freeze, [">= 0"])
  s.add_development_dependency(%q<rails>.freeze, [">= 0"])
  s.add_development_dependency(%q<rake>.freeze, [">= 0"])
  s.add_development_dependency(%q<rspec-rails>.freeze, [">= 0"])
  s.add_development_dependency(%q<rubocop>.freeze, ["~> 0.85.1"])
  s.add_development_dependency(%q<rubocop-packaging>.freeze, ["~> 0.1.1"])
  s.add_development_dependency(%q<standard>.freeze, [">= 0"])
end
