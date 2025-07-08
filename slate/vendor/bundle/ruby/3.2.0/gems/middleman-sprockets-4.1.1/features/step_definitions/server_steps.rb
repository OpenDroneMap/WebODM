Given /^wait a second$/ do
  sleep(1)
end

# rubocop:disable Lint/Debugger
Given /^binding.pry/ do
  binding.pry
end
# rubocop:enable Lint/Debugger

Given /^the file "([^\"]*)" content is changed to\:$/ do |name, content|
  step %{a file named "#{name}" with:}, content
  sleep 1
  system "touch #{File.join(ENV['MM_ROOT'], name)}"
  step %{the filesystem is polled}
end

Then /^the filesystem is polled$/ do
  if @server_inst.files.respond_to?(:poll_once!)
    @server_inst.files.poll_once!
  elsif @server_inst.files.respond_to?(:find_new_files!)
    @server_inst.files.find_new_files!
  end
end

Then /^sprockets paths should include "([^\"]*)"$/ do |path|
  sprockets = @server_inst.extensions[:sprockets].environment
  expect(sprockets.paths).to include File.join(ENV['MM_ROOT'], path)
end

Then /^sprockets paths should include gem path "([^\"]*)"/ do |path|
  sprockets = @server_inst.extensions[:sprockets].environment
  expect(sprockets.paths).to include File.join(PROJECT_ROOT_PATH, 'fixtures', 'gems', path)
end
