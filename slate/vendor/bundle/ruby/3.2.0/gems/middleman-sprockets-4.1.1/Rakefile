require 'bundler'
Bundler::GemHelper.install_tasks

require 'rake/clean'
require 'cucumber/rake/task'
require 'rspec/core/rake_task'
require 'rubocop/rake_task'

require 'middleman-core/version'
require 'sprockets/version'

Dir['./tasks/*.rake'].each { |f| load f }

Cucumber::Rake::Task.new(:cucumber, 'Run features that should pass') do |t|
  exempt_tags = ['--tags ~@wip']

  if ::Sprockets::VERSION >= '4.0'
    exempt_tags.push '--tags ~@sprockets3'
  else
    exempt_tags.push '--tags ~@sprockets4'
  end

  exempt_tags.push '--tags ~@asset_hash' if ENV['SKIP_ASSET_HASH'] == 'true'
  exempt_tags.push '--tags ~@middleman_head' unless ENV['MIDDLEMAN_HEAD'] == 'true'
  t.cucumber_opts = "--color #{exempt_tags.join(' ')} --strict"
end

RSpec::Core::RakeTask.new(:spec)

desc 'Run RuboCop on the lib & spec directory'
RuboCop::RakeTask.new(:rubocop) do |task|
  task.patterns      = ['lib/**/*.rb',
                        'spec/**/*.rb',
                        'Gemfile',
                        'Rakefile']
  task.fail_on_error = false
end

task test: [:destroy_sass_cache, :rubocop, :cucumber, :spec]
task default: :test

## removal candidates
## ------------------------------------

desc 'Build HTML documentation'
task :doc do
  sh 'bundle exec yard'
end

desc 'Destroy the sass cache from fixtures in case it messes with results'
task :destroy_sass_cache do
  Dir['fixtures/*/.sass-cache'].each do |dir|
    rm_rf dir
  end
end
