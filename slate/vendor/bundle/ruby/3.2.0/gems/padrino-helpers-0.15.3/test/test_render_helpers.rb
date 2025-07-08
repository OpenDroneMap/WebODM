require File.expand_path(File.dirname(__FILE__) + '/helper')
require File.expand_path(File.dirname(__FILE__) + '/fixtures/render_app/app')

describe "RenderHelpers" do
  def app
    RenderDemo
  end

  describe 'for #partial method and object' do
    before { get "/partial/object" }
    it 'should render partial html with object' do
      assert_response_has_tag "h1", :content => "User name is John"
    end
    it 'should have no counter index for single item' do
      assert_response_has_no_tag "p", :content => "My counter is 1", :count => 1
    end
    it 'should include extra locals information' do
      assert_response_has_tag 'p', :content => "Extra is bar"
    end
  end

  describe 'for #partial method and collection' do
    before { get "/partial/collection" }
    it 'should render partial html with collection' do
      assert_response_has_tag "h1", :content => "User name is John"
      assert_response_has_tag "h1", :content => "User name is Billy"
    end
    it 'should include counter which contains item index' do
      assert_response_has_tag "p", :content => "My counter is 1"
      assert_response_has_tag "p", :content => "My counter is 2"
    end
    it 'should include extra locals information' do
      assert_response_has_tag 'p', :content => "Extra is bar"
    end
  end

  describe 'for #partial with ext and collection' do
    before { get "/partial/collection.ext" }
    it 'should not fail horribly with `invalid locals key` RuntimeError' do
      assert_response_has_tag "h1", :content => "User name is John"
    end
  end

  describe 'for #partial method and locals' do
    before { get "/partial/locals" }
    it 'should render partial html with locals' do
      assert_response_has_tag "h1", :content => "User name is John"
    end
    it 'should have no counter index for single item' do
      assert_response_has_no_tag "p", :content => "My counter is 1", :count => 1
    end
    it 'should include extra locals information' do
      assert_response_has_tag 'p', :content => "Extra is bar"
    end
  end

  describe 'for #partial method taking a path starting with forward slash' do
    before { get "/partial/foward_slash" }
    it 'should render partial without throwing an error' do
      assert_response_has_tag "h1", :content => "User name is John"
    end
  end

  describe 'for #partial method with unsafe engine' do
    it 'should render partial without escaping it' do
      get "/partial/unsafe"
      assert_response_has_tag "h1", :content => "User name is John"
    end
    it 'should render partial object without escaping it' do
      get "/partial/unsafe_one"
      assert_response_has_tag "h1", :content => "User name is Mary"
    end
    it 'should render partial collection without escaping it' do
      get "/partial/unsafe_many"
      assert_response_has_tag "h1", :content => "User name is John"
      assert_response_has_tag "h1", :content => "User name is Mary"
    end
    it 'should render unsafe partial without escaping it' do
      get "/partial/unsafe?block=%3Cevil%3E"
      assert_response_has_tag "h1", :content => "User name is John"
      assert_response_has_tag "evil"
    end
    it 'should render unsafe partial object without escaping it' do
      get "/partial/unsafe_one?block=%3Cevil%3E"
      assert_response_has_tag "h1", :content => "User name is Mary"
      assert_response_has_tag "evil"
    end
    it 'should render unsafe partial collection without escaping it' do
      get "/partial/unsafe_many?block=%3Cevil%3E"
      assert_response_has_tag "h1", :content => "User name is John"
      assert_response_has_tag "h1", :content => "User name is Mary"
      assert_response_has_tag "evil"
    end
  end

  describe 'render with block' do
    it 'should render slim with block' do
      get "/render_block_slim"
      assert_response_has_tag 'h1', :content => 'prefix'
      assert_response_has_tag 'h3', :content => 'postfix'
      assert_response_has_tag '.slim-block'
      assert_response_has_tag 'div', :content => 'go block!'
    end
    it 'should render erb with block' do
      get "/render_block_erb"
      assert_response_has_tag 'h1', :content => 'prefix'
      assert_response_has_tag 'h3', :content => 'postfix'
      assert_response_has_tag '.erb-block'
      assert_response_has_tag 'div', :content => 'go block!'
    end
    it 'should render haml with block' do
      get "/render_block_haml"
      assert_response_has_tag 'h1', :content => 'prefix'
      assert_response_has_tag 'h3', :content => 'postfix'
      assert_response_has_tag '.haml-block'
      assert_response_has_tag 'div', :content => 'go block!'
    end
  end

  describe 'partial with block' do
    it 'should show partial slim with block' do
      get "/partial_block_slim"
      assert_response_has_tag 'h1', :content => 'prefix'
      assert_response_has_tag 'h3', :content => 'postfix'
      assert_response_has_tag '.slim-block'
      assert_response_has_tag 'div', :content => 'go block!'
      assert_response_has_tag 'div.deep', :content => 'Done'
    end
    it 'should show partial erb with block' do
      get "/partial_block_erb"
      assert_response_has_tag 'h1', :content => 'prefix'
      assert_response_has_tag 'h3', :content => 'postfix'
      assert_response_has_tag '.erb-block'
      assert_response_has_tag 'div', :content => 'go block!'
      assert_response_has_tag 'div.deep', :content => 'Done'
    end
    it 'should show partial haml with block' do
      get "/partial_block_haml"
      assert_response_has_tag 'h1', :content => 'prefix'
      assert_response_has_tag 'h3', :content => 'postfix'
      assert_response_has_tag '.haml-block'
      assert_response_has_tag 'div', :content => 'go block!'
      assert_response_has_tag 'div.deep', :content => 'Done'
    end
  end

  describe 'for #current_engine method' do
    it 'should detect correctly current engine for a padrino application' do
      get "/current_engine"
      assert_response_has_tag 'p.start', :content => "haml"
      assert_response_has_tag 'p.haml span',  :content => "haml"
      assert_response_has_tag 'p.erb span',   :content => "erb"
      assert_response_has_tag 'p.slim span',  :content => "slim"
      assert_response_has_tag 'p.end',   :content => "haml"
    end

    it 'should detect correctly current engine for explicit engine on partials' do
      get "/explicit_engine"
      assert_response_has_tag 'p.start', :content => "haml"
      assert_response_has_tag 'p.haml span',  :content => "haml"
      assert_response_has_tag 'p.erb span',   :content => "erb"
      assert_response_has_tag 'p.slim span',  :content => "slim"
      assert_response_has_tag 'p.end',   :content => "haml"
    end

    it 'should capture slim template once and only once' do
      $number_of_captures = 0
      get "/double_capture_slim"
      assert_equal 1,$number_of_captures
    end

    it 'should capture haml template once and only once' do
      $number_of_captures = 0
      get "/double_capture_haml"
      assert_equal 1,$number_of_captures
    end

    it 'should capture erb template once and only once' do
      $number_of_captures = 0
      get "/double_capture_erb"
      assert_equal 1,$number_of_captures
    end

    it 'should fail on wrong erb usage' do
      assert_raises(SyntaxError) do
        get "/wrong_capture_erb"
      end
    end

    it 'should ignore wrong haml usage' do
      get "/wrong_capture_haml"
      assert_response_has_no_tag 'p', :content => 'this is wrong'
    end

    it 'should ignore wrong slim usage' do
      get "/wrong_capture_slim"
      assert_response_has_no_tag 'p', :content => 'this is wrong'
    end

    it 'should support weird ruby blocks in erb' do
      get "/ruby_block_capture_erb"
      assert_response_has_tag 'b', :content => 'c'
    end

    it 'should support weird ruby blocks in haml' do
      get "/ruby_block_capture_haml"
      assert_response_has_tag 'b', :content => 'c'
    end
    
    it 'should support weird ruby blocks in slim' do
      get "/ruby_block_capture_slim"
      assert_response_has_tag 'b', :content => 'c'
    end
  end

  describe 'standalone partial rendering' do
    it 'should properly render without Sinatra::Base or Padrino::Application' do
      class Standalone
        include Padrino::Helpers::RenderHelpers
      end
      locals = { :user => OpenStruct.new(:name => 'Joe') }
      result = Standalone.new.partial(File.join(File.dirname(__FILE__), 'fixtures/render_app/views/template/user'), :engine => :haml, :locals => locals)
      assert_equal '<h1>User name is Joe</h1>', result.chomp
    end

    it 'should pass class context to renderer' do
      class Standalone1
        include Padrino::Helpers::RenderHelpers
        def user
          OpenStruct.new(:name => 'Jane')
        end
      end

      result = Standalone1.new.partial(File.join(File.dirname(__FILE__), 'fixtures/render_app/views/template/user.haml'))
      assert_equal '<h1>User name is Jane</h1>', result.chomp
    end

    it 'should fail on missing template' do
      class Standalone2
        include Padrino::Helpers::RenderHelpers
      end
      assert_raises RuntimeError do
        result = Standalone2.new.partial('none')
      end
    end

    it 'should not override existing render methods' do
      class Standalone3
        def render(*)
          'existing'
        end
        include Padrino::Helpers::RenderHelpers
      end
      assert_equal 'existing', Standalone3.new.partial('none')
    end

    it 'should not add "./" to partial template name' do
      class Standalone4
        def render(_, file, *)
          file.to_s
        end
        include Padrino::Helpers::RenderHelpers
      end
      assert_equal '_none', Standalone4.new.partial('none')
    end
  end

  describe 'partial in an application with layout' do
    it 'should not render with default layout' do
      get '/'
      assert_response_has_tag 'body', :count => 1
    end
  end
end
