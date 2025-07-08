ENV['RACK_ENV'] = 'test'

require 'minitest/autorun'
require 'minitest/pride'
require 'mocha/minitest'
require 'rack/test'
require 'builder'
require 'padrino-helpers'
require 'padrino/rendering'
require 'tilt/liquid'
require 'tilt/builder'

require 'ext/minitest-spec'
require 'ext/rack-test-methods'
require 'padrino/test-methods'

class MiniTest::Spec
  include Padrino::Helpers::OutputHelpers
  include Padrino::Helpers::TagHelpers
  include Padrino::Helpers::AssetTagHelpers
  include Rack::Test::Methods
  include Padrino::TestMethods

  def stop_time_for_test
    time = Time.now
    Time.stubs(:now).returns(time)
    return time
  end

  # mock_model("Business", :new_record? => true) => <Business>
  def mock_model(klazz, options={})
    options = { :class => klazz, :new_record? => false, :id => 20, :errors => {}}.update(options)
    record = stub(options)
    record.stubs(:to_ary => [record])
    record
  end

  def create_template(name, content, options={})
    FileUtils.mkdir_p(File.dirname(__FILE__) + "/views")
    FileUtils.mkdir_p(File.dirname(__FILE__) + "/views/layouts")
    path  = "/views/#{name}"
    path += ".#{options.delete(:locale)}" if options[:locale]
    path += ".#{options[:format]}" if options[:format]
    path += ".erb" unless options[:format].to_s =~ /erb|slim|haml|rss|atom|builder|liquid/
    path += ".builder" if options[:format].to_s =~ /rss|atom/
    file  = File.dirname(__FILE__) + path
    File.open(file, 'w') { |io| io.write content }
    file
  end
  alias :create_view   :create_template
  alias :create_layout :create_template

  def remove_views
    FileUtils.rm_rf(File.dirname(__FILE__) + "/views")
  end

  def with_template(name, content, options={})
    template = create_template(name, content, options)
    yield
  ensure
    File.unlink(template) rescue nil
    remove_views
  end
  alias :with_view   :with_template
  alias :with_layout :with_template

  def mock_app(base=Padrino::Application, &block)
    @app = Sinatra.new base do
      register Padrino::Helpers
      instance_eval &block
    end
  end

  def app
    Rack::Lint.new(@app)
  end
end
