require 'bundler/gem_tasks'
require 'cucumber/rake/task'

Cucumber::Rake::Task.new(:cucumber, 'Run features that should pass') do |t|
  exempt_tags = ["--tags 'not @wip'"]
  exempt_tags << "--tags 'not @nojava'" if RUBY_PLATFORM == "java"
  t.cucumber_opts = "--require features --color #{exempt_tags.join(' ')} --strict --format #{ENV['CUCUMBER_FORMAT'] || 'pretty'}"
end

task :test => ["cucumber"]
task :default => :test

desc "Build HTML documentation"
task :doc do
  sh 'bundle exec yard'
end
