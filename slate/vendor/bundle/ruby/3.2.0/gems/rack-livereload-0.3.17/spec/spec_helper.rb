require 'mocha/api'
require 'webmock/rspec'

require 'rack-livereload'

RSpec.configure do |c|
  c.mock_with :mocha
end

module RSpec::Matchers
  define :use_vendored do
    match do |subject|
      subject.use_vendored?
    end
  end
end
