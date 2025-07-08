Gem::Specification.new do |gem|
  gem.name          = 'assets_gem'
  gem.version       = '0.0.0'
  gem.platform      = Gem::Platform::RUBY

  gem.summary       = 'dummy gem for a fixture'
  gem.description   = 'dummy gem for a fixture'
  gem.authors       = ['Steven Sloan']
  gem.email         = ['stevenosloan@gmail.com']
  gem.license       = 'MIT'

  gem.files         = Dir['lib/**/*.rb', 'vendor/**/*']
  gem.require_path  = 'lib'
end
