require 'bundler'
Bundler::GemHelper.install_tasks

begin
  require 'rspec/core/rake_task'
  RSpec::Core::RakeTask.new(:spec)
rescue LoadError
end

require 'cucumber/rake/task'

Cucumber::Rake::Task.new(:cucumber, 'Run features that should pass') do |t|
  ENV["TEST"] = "true"

  exempt_tags = ""
  exempt_tags << "--tags ~@nojava" if RUBY_PLATFORM == "java"

  t.cucumber_opts = "--color --tags ~@wip #{exempt_tags} --strict --format #{ENV['CUCUMBER_FORMAT'] || 'pretty'}"
end

require 'rake/clean'

task :test => ["spec", "cucumber"]

desc "Build HTML documentation"
task :doc do
  sh 'bundle exec yard'
end