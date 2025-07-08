require 'spec_helper'
require 'nokogiri'

describe Rack::LiveReload::BodyProcessor do
  describe 'head tag regex' do
    let(:regex) { described_class::HEAD_TAG_REGEX }
    subject { regex }

    it { should be_kind_of(Regexp) }

    it 'only picks a valid <head> tag' do
      regex.match("<head></head>").to_s.should eq('<head>')
      regex.match("<head><title></title></head>").to_s.should eq('<head>')
      regex.match("<head attribute='something'><title></title></head>").to_s.should eq("<head attribute='something'>")
    end

    it 'responds false when no head tag' do
      regex.match("<header></header>").should be_falsey
    end
  end

  let(:processor) { described_class.new(body, options) }
  let(:body) { [ page_html ] }
  let(:options) { {} }
  let(:page_html) { '<head></head>' }

  let(:processor_result) do
    if !processor.processed?
      processor.process!(env)
    end

    processor
  end

  subject { processor }

  describe "livereload local uri" do
    context 'does not exist' do
      before do
        stub_request(:any, 'localhost:35729/livereload.js').to_timeout
      end

      it { should use_vendored }
    end

    context 'exists' do
      before do
        stub_request(:any, 'localhost:35729/livereload.js')
      end

      it { should_not use_vendored }
    end

    context 'with custom port' do
      let(:options) { {:live_reload_port => '12348'}}

      context 'exists' do
        before do
          stub_request(:any, 'localhost:12348/livereload.js')
        end
        it { should_not use_vendored }
      end
    end

    context 'specify vendored' do
      let(:options) { { :source => :vendored } }

      it { should use_vendored }
    end

    context 'specify LR' do
      let(:options) { { :source => :livereload } }

      it { should_not use_vendored }
    end
  end

  context 'text/html' do
    before do
      processor.stubs(:use_vendored?).returns(true)
    end

    let(:host) { 'host' }
    let(:env) { { 'HTTP_HOST' => host } }

    let(:processed_body) { processor_result.new_body.join('') }
    let(:length) { processor_result.content_length }

    let(:page_html) { '<head></head>' }

    context 'vendored' do
      it 'should add the vendored livereload js script tag' do
        processed_body.should include("script")
        processed_body.should include(described_class::LIVERELOAD_JS_PATH)

        length.to_s.should == processed_body.length.to_s

        described_class::LIVERELOAD_JS_PATH.should_not include(host)

        processed_body.should include('swfobject')
        processed_body.should include('web_socket')
      end
    end

    context 'at the top of the head tag' do
      let(:page_html) { '<head attribute="attribute"><script type="text/javascript" insert="first"></script><script type="text/javascript" insert="before"></script></head>' }

      let(:body_dom) { Nokogiri::XML(processed_body) }

      it 'should add the livereload js script tag before all other script tags' do
        body_dom.at_css("head")[:attribute].should == 'attribute'
        body_dom.at_css("script:eq(5)")[:src].should include(described_class::LIVERELOAD_JS_PATH)
        body_dom.at_css("script:last-child")[:insert].should == "before"
      end

      context 'when a relative URL root is specified' do
        before do
          ENV['RAILS_RELATIVE_URL_ROOT'] = '/a_relative_path'
        end

        it 'should prepend the relative path to the script src' do
          body_dom.at_css("script:eq(5)")[:src].should match(%r{^/a_relative_path/})
        end
      end
    end

    describe "LIVERELOAD_PORT value" do
      let(:options) { { :live_reload_port => 12345 }}

      it "sets the variable at the top of the file" do
        processed_body.should include 'RACK_LIVERELOAD_PORT = 12345'
      end
    end

    context 'in header tags' do
      let(:page_html) { "<header class='hero'><h1>Just a normal header tag</h1></header>" }

      let(:body_dom) { Nokogiri::XML(processed_body) }

      it 'should not add the livereload js' do
        body_dom.at_css("header")[:class].should == 'hero'
        body_dom.css('script').should be_empty
      end
    end

    context 'not vendored' do
      before do
        processor.stubs(:use_vendored?).returns(false)
      end

      it 'should add the LR livereload js script tag' do
        processed_body.should include("script")
        processed_body.should include(processor.livereload_local_uri.gsub('localhost', 'host'))
      end
    end

    context 'set options' do
      let(:options) { { :host => new_host, :port => port, :min_delay => min_delay, :max_delay => max_delay } }
      let(:min_delay) { 5 }
      let(:max_delay) { 10 }
      let(:port) { 23 }
      let(:new_host) { 'myhost' }

      it 'should add the livereload.js script tag' do
        processed_body.should include("mindelay=#{min_delay}")
        processed_body.should include("maxdelay=#{max_delay}")
        processed_body.should include("port=#{port}")
        processed_body.should include("host=#{new_host}")
      end
    end

    context 'force flash' do
      let(:options) { { :force_swf => true } }

      it 'should not add the flash shim' do
        processed_body.should include('WEB_SOCKET_FORCE_FLASH')
        processed_body.should include('swfobject')
        processed_body.should include('web_socket')
      end
    end

    context 'no flash' do
      let(:options) { { :no_swf => true } }

      it 'should not add the flash shim' do
        processed_body.should_not include('swfobject')
        processed_body.should_not include('web_socket')
      end
    end

    context 'no host at all' do
      let(:env) { {} }

      it 'should use localhost' do
        processed_body.should include('localhost')
      end
    end
  end
end

