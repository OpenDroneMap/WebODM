require 'bundler/gem_tasks'
require 'rake/testtask'

Rake::TestTask.new do |t|
  t.libs << 'lib' << 'test'
  files = Dir['test/haml/**/*_test.rb']
  t.ruby_opts = %w[-rtest_helper]
  t.test_files = files
  t.verbose = true
end
task :test

desc 'bench task for CI'
task :bench do
  if ENV['SLIM_BENCH'] == '1'
    cmd = %w[bundle exec ruby benchmark/slim/run-benchmarks.rb]
  else
    cmd = ['bin/bench', 'bench', ('-c' if ENV['COMPILE'] == '1'), *ENV['TEMPLATE'].split(',')].compact
  end
  exit system(*cmd)
end

namespace :doc do
  task :sass do
    require 'sass'
    Dir["yard/default/**/*.sass"].each do |sass|
      File.open(sass.gsub(/sass$/, 'css'), 'w') do |f|
        f.write(Sass::Engine.new(File.read(sass)).render)
      end
    end
  end

  desc "List all undocumented methods and classes."
  task :undocumented do
    command = 'yard --list --query '
    command << '"object.docstring.blank? && '
    command << '!(object.type == :method && object.is_alias?)"'
    sh command
  end
end

desc "Generate documentation"
task(:doc => 'doc:sass') {sh "yard"}

desc "Generate documentation incrementally"
task(:redoc) {sh "yard -c"}

task default: :test
