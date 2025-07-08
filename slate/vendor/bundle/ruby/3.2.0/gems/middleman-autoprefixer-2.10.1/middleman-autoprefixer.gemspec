# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'middleman-autoprefixer/version'

Gem::Specification.new do |spec|
  spec.name          = 'middleman-autoprefixer'
  spec.version       = Middleman::Autoprefixer::VERSION
  spec.authors       = ['Dominik Porada', 'Thomas Reynolds']
  spec.email         = ['dominik@porada.co', 'me@tdreyno.com']
  spec.summary       = 'Automatically vendor-prefix stylesheets served by Middleman.'
  spec.homepage      = 'https://github.com/middleman/middleman-autoprefixer'
  spec.license       = 'MIT'

  spec.files         = `git ls-files`.split($/)
  spec.test_files    = `git ls-files -- {features,fixtures}/*`.split($/)
  spec.require_paths = ['lib']

  spec.add_runtime_dependency 'middleman-core',     '>= 3.3.3'
  spec.add_runtime_dependency 'autoprefixer-rails', '~> 9.1'

  spec.add_development_dependency 'bundler',        '>= 1.14'
  spec.add_development_dependency 'rake',           '>= 10.3'
end
