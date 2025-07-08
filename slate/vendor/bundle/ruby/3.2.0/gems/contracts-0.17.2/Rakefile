# frozen_string_literal: true

task :default => [:spec]

task :add_tag do
  `git tag -a v#{Contracts::VERSION} -m 'v#{Contracts::VERSION}'`
end

require "rspec/core/rake_task"
RSpec::Core::RakeTask.new(:spec)
