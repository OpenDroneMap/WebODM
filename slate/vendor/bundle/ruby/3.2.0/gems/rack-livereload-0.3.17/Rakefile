require "bundler/gem_tasks"
require 'bundler/setup'
require 'appraisal'

desc 'Update livereload.js'
task :update_livereload_js do
  require 'httparty'

  File.open('js/livereload.js', 'wb') { |fh|
    fh.print HTTParty.get('https://raw.github.com/livereload/livereload-js/master/dist/livereload.js').body
  }
end

desc 'Update web-socket-js'
task :update_web_socket_js do
  require 'httparty'

  %w{swfobject.js web_socket.js WebSocketMain.swf}.each do |file|
    File.open("js/#{file}", 'wb') do |fh|
      fh.print HTTParty.get("https://raw.github.com/gimite/web-socket-js/master/#{file}").body
    end
  end
end

require 'rspec/core/rake_task'

RSpec::Core::RakeTask.new(:spec)

require 'cucumber/rake/task'

Cucumber::Rake::Task.new(:cucumber)

task :default => [ :spec, :cucumber ]

