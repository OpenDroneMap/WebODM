require 'bundler/gem_tasks'
require 'cucumber/rake/task'

task :default => :test

Cucumber::Rake::Task.new(:test, 'Run features that should pass') do |task|
  task.cucumber_opts = '--color --strict --format pretty'
end
