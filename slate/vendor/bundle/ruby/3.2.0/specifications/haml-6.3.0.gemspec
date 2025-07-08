# -*- encoding: utf-8 -*-
# stub: haml 6.3.0 ruby lib

Gem::Specification.new do |s|
  s.name = "haml".freeze
  s.version = "6.3.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "rubygems_mfa_required" => "true" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Natalie Weizenbaum".freeze, "Hampton Catlin".freeze, "Norman Clarke".freeze, "Akira Matsuda".freeze, "Takashi Kokubun".freeze]
  s.bindir = "exe".freeze
  s.date = "2023-12-10"
  s.description = "An elegant, structured (X)HTML/XML templating engine.".freeze
  s.email = ["haml@googlegroups.com".freeze, "ronnie@dio.jp".freeze]
  s.executables = ["haml".freeze]
  s.files = ["exe/haml".freeze]
  s.homepage = "https://haml.info".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.1.0".freeze)
  s.rubygems_version = "3.4.20".freeze
  s.summary = "An elegant, structured (X)HTML/XML templating engine.".freeze

  s.installed_by_version = "3.4.20" if s.respond_to? :installed_by_version

  s.specification_version = 4

  s.add_runtime_dependency(%q<temple>.freeze, [">= 0.8.2"])
  s.add_runtime_dependency(%q<thor>.freeze, [">= 0"])
  s.add_runtime_dependency(%q<tilt>.freeze, [">= 0"])
  s.add_development_dependency(%q<benchmark_driver>.freeze, [">= 0"])
  s.add_development_dependency(%q<bundler>.freeze, [">= 0"])
  s.add_development_dependency(%q<coffee-script>.freeze, [">= 0"])
  s.add_development_dependency(%q<erubi>.freeze, [">= 0"])
  s.add_development_dependency(%q<haml>.freeze, [">= 5"])
  s.add_development_dependency(%q<less>.freeze, [">= 0"])
  s.add_development_dependency(%q<minitest-reporters>.freeze, ["~> 1.1"])
  s.add_development_dependency(%q<rails>.freeze, [">= 4.0"])
  s.add_development_dependency(%q<rake>.freeze, [">= 0"])
  s.add_development_dependency(%q<sass>.freeze, [">= 0"])
  s.add_development_dependency(%q<slim>.freeze, [">= 0"])
  s.add_development_dependency(%q<string_template>.freeze, [">= 0"])
  s.add_development_dependency(%q<unindent>.freeze, [">= 0"])
end
