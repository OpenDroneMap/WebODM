require File.expand_path(File.dirname(__FILE__) + '/helper')
require 'slim'
require 'liquid'

describe "Rendering" do
  def setup
    Padrino::Rendering::DEFAULT_RENDERING_OPTIONS[:strict_format] = false
    I18n.enforce_available_locales = true
  end

  def teardown
    I18n.locale = :en
    remove_views
  end

  describe 'for application layout functionality' do

    it 'should get no layout' do
      mock_app do
        get("/"){ "no layout" }
      end

      get "/"
      assert_equal "no layout", body
    end

    it 'should be compatible with sinatra layout' do
      mock_app do
        layout do
          "this is a <%= yield %>"
        end

        get("/"){ render :erb, "sinatra layout", :layout => true }
      end

      get "/"
      assert_equal "this is a sinatra layout", body
    end

    it 'should use rails way layout' do
      with_layout :application, "this is a <%= yield %>" do
        mock_app do
          get("/"){ render :erb, "rails way layout" }
        end

        get "/"
        assert_equal "this is a rails way layout", body
      end
    end

    it 'should use rails way for a custom layout' do
      with_layout "layouts/custom", "this is a <%= yield %>" do
        mock_app do
          layout :custom
          get("/"){ render :erb, "rails way custom layout" }
        end

        get "/"
        assert_equal "this is a rails way custom layout", body
      end
    end

    it 'should not use layout' do
      with_layout :application, "this is an <%= yield %>" do
        with_view :index, "index" do
          mock_app do
            get("/with/layout"){ render :index }
            get("/without/layout"){ render :index, :layout => false }
          end
          get "/with/layout"
          assert_equal "this is an index", body
          get "/without/layout"
          assert_equal "index", body
        end
      end
    end

    it 'should not use layout with js format' do
      create_layout :application, "this is an <%= yield %>"
      create_view :foo, "erb file"
      create_view :foo, "js file", :format => :js
      mock_app do
        get('/layout_test', :provides => [:html, :js]){ render :foo }
      end
      get "/layout_test"
      assert_equal "this is an erb file", body
      get "/layout_test.js"
      assert_equal "js file", body
    end

    it 'should set and restore layout in controllers' do
      create_layout :boo, "boo is a <%= yield %>"
      create_layout :moo, "moo is a <%= yield %>"
      create_view :foo, "liquid file", :format => :liquid
      mock_app do
        layout :boo
        controller :moo do
          layout :moo
          get('/liquid') { render :foo }
        end
        controller :boo do
          get('/liquid') { render :foo }
        end
      end
      get "/moo/liquid"
      assert_equal "moo is a liquid file", body
      get "/boo/liquid"
      assert_equal "boo is a liquid file", body
    end

    it 'should use correct layout for each format' do
      create_layout :application, "this is an <%= yield %>"
      create_layout :application, "document start <%= yield %> end", :format => :xml
      create_view :foo, "erb file"
      create_view :foo, "xml file", :format => :xml
      mock_app do
        get('/layout_test', :provides => [:html, :xml]){ render :foo }
      end
      get "/layout_test"
      assert_equal "this is an erb file", body
      get "/layout_test.xml"
      assert_equal "document start xml file end", body
    end

    it 'should by default use html file when no other is given' do
      create_layout :baz, "html file", :format => :html

      mock_app do
        get('/content_type_test', :provides => [:html, :xml]) { render :baz }
      end

      get "/content_type_test"
      assert_equal "html file", body
      get "/content_type_test.html"
      assert_equal "html file", body
      get "/content_type_test.xml"
      assert_equal "html file", body
    end

    it 'should find proper templates when content_type is set by string' do
      create_layout :error, "layout<%= yield %>"
      create_view :e404, "404 file"

      mock_app do
        not_found do
          content_type 'text/html'
          render 'e404', :layout => :error
        end
      end
      get '/missing'
      assert_equal 'layout404 file', body
    end

    it 'should work with set content type not contained in rack-types' do
      create_view "index.md.erb", "Hello"
      mock_app do
        get("/") {
          content_type "text/x-markdown; charset=UTF-8"
          render "index.erb", { :layout => nil }
        }
      end
      get "/"
      assert_equal "Hello", body
    end

    it 'should not use html file when DEFAULT_RENDERING_OPTIONS[:strict_format] == true' do
      create_layout :foo, "html file", :format => :html

      mock_app do
        get('/default_rendering_test', :provides => [:html, :xml]) { render :foo }
      end

      @save = Padrino::Rendering::DEFAULT_RENDERING_OPTIONS
      Padrino::Rendering::DEFAULT_RENDERING_OPTIONS[:strict_format] = true

      get "/default_rendering_test"
      assert_equal "html file", body
      assert_raises Padrino::Rendering::TemplateNotFound do
        get "/default_rendering_test.xml"
      end

      Padrino::Rendering::DEFAULT_RENDERING_OPTIONS.merge!(@save)
    end

    it 'should use correct layout with each controller' do
      create_layout :foo, "foo layout at <%= yield %>"
      create_layout :bar, "bar layout at <%= yield %>"
      create_layout :baz, "baz layout at <%= yield %>"
      create_layout :application, "default layout at <%= yield %>"
      mock_app do
        get("/"){ render :erb, "application" }
        controller :foo do
          layout :foo
          get("/"){ render :erb, "foo" }
        end
        controller :bar do
          layout :bar
          get("/"){ render :erb, "bar" }
        end
        controller :baz do
          layout :baz
          get("/"){ render :erb, "baz", :layout => true }
        end
        controller :none do
          get("/") { render :erb, "none" }
          get("/with_foo_layout")  { render :erb, "none with layout", :layout => :foo }
        end
      end
      get "/foo"
      assert_equal "foo layout at foo", body
      get "/bar"
      assert_equal "bar layout at bar", body
      get "/baz"
      assert_equal "baz layout at baz", body
      get "/none"
      assert_equal "default layout at none", body
      get "/none/with_foo_layout"
      assert_equal "foo layout at none with layout", body
      get "/"
      assert_equal "default layout at application", body
    end
  end

  it 'should solve layout in layouts paths' do
    create_layout :foo, "foo layout <%= yield %>"
    create_layout :"layouts/bar", "bar layout <%= yield %>"
    mock_app do
      get("/") { render :erb, "none" }
      get("/foo") { render :erb, "foo", :layout => :foo }
      get("/bar") { render :erb, "bar", :layout => :bar }
    end
    get "/"
    assert_equal "none", body
    get "/foo"
    assert_equal "foo layout foo", body
    get "/bar"
    assert_equal "bar layout bar", body
  end

  it 'should allow to render template with layout option that using other template engine.' do
    create_layout :"layouts/foo", "application layout for <%= yield %>", :format => :erb
    create_view :slim, "| slim", :format => :slim
    create_view :haml, "haml", :format => :haml
    create_view :erb, "erb", :format => :erb
    mock_app do
      get("/slim") { render("slim.slim", :layout => "foo.erb") }
      get("/haml") { render("haml.haml", :layout => "foo.erb") }
      get("/erb") { render("erb.erb", :layout => "foo.erb") }
    end
    get "/slim"
    assert_equal "application layout for slim", body.chomp
    get "/haml"
    assert_equal "application layout for haml", body.chomp
    get "/erb"
    assert_equal "application layout for erb", body.chomp
  end

  it 'should allow to use extension with layout method.' do
    create_layout :"layouts/bar", "application layout for <%= yield %>", :format => :erb
    create_view :slim, "| slim", :format => :slim
    create_view :haml, "haml", :format => :haml
    create_view :erb, "erb", :format => :erb
    mock_app do
      layout "bar.erb"
      get("/slim") { render("slim.slim") }
      get("/haml") { render("haml.haml") }
      get("/erb") { render("erb.erb") }
    end
    get "/slim"
    assert_equal "application layout for slim", body.chomp
    get "/haml"
    assert_equal "application layout for haml", body.chomp
    get "/erb"
    assert_equal "application layout for erb", body.chomp
  end

  it 'should find a layout by symbol' do
    create_layout :"layouts/bar", "application layout for <%= yield %>", :format => :erb
    create_view :slim, "| slim", :format => :slim
    create_view :haml, "haml", :format => :haml
    create_view :erb, "erb", :format => :erb
    mock_app do
      layout :bar
      get("/slim") { render("slim.slim") }
      get("/haml") { render("haml.haml") }
      get("/erb") { render("erb.erb") }
    end
    get "/slim"
    assert_equal "application layout for slim", body.chomp
    get "/haml"
    assert_equal "application layout for haml", body.chomp
    get "/erb"
    assert_equal "application layout for erb", body.chomp
  end

  it 'should not apply default layout to unsupported layout engines' do
    create_layout :application, "erb template <%= yield %>", :format => :erb
    create_view 'foo', "xml.instruct!", :format => :builder
    mock_app do
      get('/layout_test.xml' ){ render :foo }
    end
    get "/layout_test.xml"
    refute_match /erb template/, body
    assert_match '<?xml', body
  end

  describe 'for application render functionality' do

    it 'should work properly with logging and missing layout' do
      create_view :index, "<%= foo %>"
      mock_app do
        enable :logging
        get("/") { render "index", { :layout => nil }, { :foo => "bar" } }
      end
      get "/"
      assert_equal "bar", body
    end

    it 'should work properly with logging and layout' do
      create_layout :application, "layout <%= yield %>"
      create_view :index, "<%= foo %>"
      mock_app do
        enable :logging
        get("/") { render "index", { :layout => true }, { :foo => "bar" } }
      end
      get "/"
      assert_equal "layout bar", body
    end

    it 'should be compatible with sinatra render' do
      mock_app do
        get("/"){ render :erb, "<%= 1+2 %>" }
      end
      get "/"
      assert_equal "3", body
    end

    it 'should support passing locals into render' do
      create_layout :application, "layout <%= yield %>"
      create_view :index, "<%= foo %>"
      mock_app do
        get("/") { render "index", { :layout => true }, { :foo => "bar" } }
      end
      get "/"
      assert_equal "layout bar", body
    end

    it 'should support passing locals into sinatra render' do
      create_layout :application, "layout <%= yield %>"
      create_view :index, "<%= foo %>"
      mock_app do
        get("/") { render :erb, :index, { :layout => true }, { :foo => "bar" } }
      end
      get "/"
      assert_equal "layout bar", body
    end

    it 'should support passing locals into special nil engine render' do
      create_layout :application, "layout <%= yield %>"
      create_view :index, "<%= foo %>"
      mock_app do
        get("/") { render nil, :index, { :layout => true }, { :foo => "bar" } }
      end
      get "/"
      assert_equal "layout bar", body
    end

    it 'should be compatible with sinatra views' do
      with_view :index, "<%= 1+2 %>" do
        mock_app do
          get("/foo") { render :erb, :index }
          get("/bar") { erb :index }
          get("/dir") { "3" }
          get("/inj") { erb "<%= 2+1 %>" }
          get("/rnj") { render :erb, "<%= 2+1 %>" }
        end
        get "/foo"
        assert_equal "3", body
        get "/bar"
        assert_equal "3", body
        get "/dir"
        assert_equal "3", body
        get "/inj"
        assert_equal "3", body
        get "/rnj"
        assert_equal "3", body
      end
    end

    it 'should resolve template engine' do
      with_view :index, "<%= 1+2 %>" do
        mock_app do
          get("/foo") { render :index }
          get("/bar") { render "/index" }
        end
        get "/foo"
        assert_equal "3", body
        get "/bar"
        assert_equal "3", body
      end
    end

    it 'should resolve template content type' do
      create_view :foo, "Im Js", :format => :js
      create_view :foo, "Im Erb"
      mock_app do
        get("/foo", :provides => :js) { render :foo }
        get("/bar.js") { render :foo }
      end
      get "/foo.js"
      assert_equal "Im Js", body
      # TODO: implement this!
      # get "/bar.js"
      # assert_equal "Im Js", body
    end

    it 'should resolve with explicit template format' do
      create_view :foo, "Im Js", :format => :js
      create_view :foo, "Im Haml", :format => :haml
      create_view :foo, "Im Xml", :format => :xml
      mock_app do
        get("/foo_normal", :provides => :js) { render 'foo' }
        get("/foo_haml", :provides => :js) { render 'foo.haml' }
        get("/foo_xml", :provides => :js) { render 'foo.xml' }
      end
      get "/foo_normal.js"
      assert_equal "Im Js", body
      get "/foo_haml.js"
      assert_equal "Im Haml\n", body
      get "/foo_xml.js"
      assert_equal "Im Xml", body
    end

    it 'should resolve without explict template format' do
      create_view :foo, "Im Html"
      create_view :foo, "xml.rss", :format => :rss
      mock_app do
        get(:index, :map => "/", :provides => [:html, :rss]){ render 'foo' }
      end
      get "/", {}, { 'HTTP_ACCEPT' => 'text/html;q=0.9' }
      assert_equal "Im Html", body
      get ".rss"
      assert_equal "<rss/>\n", body
    end

    it 'should ignore files ending in tilde and not render them' do
      create_view :foo, "Im Wrong", :format => 'haml~'
      create_view :foo, "Im Haml",  :format => :haml
      create_view :bar, "Im Haml backup", :format => 'haml~'
      mock_app do
        get('/foo') { render 'foo' }
        get('/bar') { render 'bar' }
      end
      get '/foo'
      assert_equal "Im Haml\n", body
      assert_raises(Padrino::Rendering::TemplateNotFound) { get '/bar' }
    end

    it 'should resolve template locale' do
      create_view :foo, "Im English", :locale => :en
      create_view :foo, "Im Italian", :locale => :it
      mock_app do
        get("/foo") { render :foo }
      end
      I18n.locale = :en
      get "/foo"
      assert_equal "Im English", body
      I18n.locale = :it
      get "/foo"
      assert_equal "Im Italian", body
    end

    it 'should resolve template content_type and locale' do
      create_view :foo, "Im Js",          :format => :js
      create_view :foo, "Im Erb"
      create_view :foo, "Im English Erb", :locale => :en
      create_view :foo, "Im Italian Erb", :locale => :it
      create_view :foo, "Im English Js",  :format => :js, :locale => :en
      create_view :foo, "Im Italian Js",  :format => :js, :locale => :it
      mock_app do
        get("/foo", :provides => [:html, :js]) { render :foo }
      end

      I18n.enforce_available_locales = false
      I18n.locale = :none
      get "/foo.js"
      assert_equal "Im Js", body
      get "/foo"
      assert_equal "Im Erb", body
      I18n.enforce_available_locales = true

      I18n.locale = :en
      get "/foo"
      assert_equal "Im English Erb", body
      I18n.locale = :it
      get "/foo"
      assert_equal "Im Italian Erb", body
      I18n.locale = :en
      get "/foo.js"
      assert_equal "Im English Js", body
      I18n.locale = :it
      get "/foo.js"
      assert_equal "Im Italian Js", body
      I18n.locale = :en
      get "/foo.pk"
      assert_equal 404, status
    end

    it 'should resolve layouts from specific application' do
      require File.expand_path(File.dirname(__FILE__) + '/fixtures/apps/render')
      @app = RenderDemo2
      get '/blog/override'
      assert_equal 'otay', body
    end

    it 'should resolve templates and layouts located in absolute paths' do
      mock_app do
        get("/foo") { render 'apps/views/blog/post', :layout => 'layout', :views => File.dirname(__FILE__)+'/fixtures' }
      end
      get '/foo'
      assert_match /okay absolute layout/, body
    end

    it 'should resolve template content_type and locale with layout' do
      create_layout :foo, "Hello <%= yield %> in a Js layout",     :format => :js
      create_layout :foo, "Hello <%= yield %> in a Js-En layout",  :format => :js, :locale => :en
      create_layout :foo, "Hello <%= yield %> in a Js-It layout",  :format => :js, :locale => :it
      create_layout :foo, "Hello <%= yield %> in a Erb-En layout", :locale => :en
      create_layout :foo, "Hello <%= yield %> in a Erb-It layout", :locale => :it
      create_layout :foo, "Hello <%= yield %> in a Erb layout"
      create_view   :bar, "Im Js",          :format => :js
      create_view   :bar, "Im Erb"
      create_view   :bar, "Im English Erb", :locale => :en
      create_view   :bar, "Im Italian Erb", :locale => :it
      create_view   :bar, "Im English Js",  :format => :js, :locale => :en
      create_view   :bar, "Im Italian Js",  :format => :js, :locale => :it
      create_view   :bar, "Im a json",      :format => :json
      mock_app do
        layout :foo
        get("/bar", :provides => [:html, :js, :json]) { render :bar }
      end

      I18n.enforce_available_locales = false
      I18n.locale = :none
      get "/bar.js"
      assert_equal "Hello Im Js in a Js layout", body
      get "/bar"
      assert_equal "Hello Im Erb in a Erb layout", body
      I18n.enforce_available_locales = true

      I18n.locale = :en
      get "/bar"
      assert_equal "Hello Im English Erb in a Erb-En layout", body
      I18n.locale = :it
      get "/bar"
      assert_equal "Hello Im Italian Erb in a Erb-It layout", body
      I18n.locale = :en
      get "/bar.js"
      assert_equal "Hello Im English Js in a Js-En layout", body
      I18n.locale = :it
      get "/bar.js"
      assert_equal "Hello Im Italian Js in a Js-It layout", body
      I18n.locale = :en
      get "/bar.json"
      assert_equal "Im a json", body
      get "/bar.pk"
      assert_equal 404, status

    end

    it 'should resolve template location relative to controller name' do
      require File.expand_path(File.dirname(__FILE__) + '/fixtures/apps/render')
      @app = RenderDemo2
      get '/blog'
      assert_equal 'okay', body
    end

    it 'should resolve nested template location relative to controller name' do
      require File.expand_path(File.dirname(__FILE__) + '/fixtures/apps/render')
      @app = RenderDemo2
      get '/article/comment'
      assert_equal 'okay comment', body
    end

    it 'should renders erb with blocks' do
      mock_app do
        helpers do
          def container
            @_out_buf << "THIS."
            yield
            @_out_buf << "SPARTA!"
          end
          def is; "IS."; end
        end
        get '/' do
          render :erb, '<% container do %> <%= is %> <% end %>'
        end
      end
      get '/'
      assert ok?
      assert_equal 'THIS. IS. SPARTA!', body
    end

    it 'should render erb to a SafeBuffer' do
      mock_app do
        layout do
          "this is a <%= yield %>"
        end
        get '/' do
          render :erb, '<p><%= %q{<script lang="ronin">alert("https://github.com/ronin-ruby/ronin")</script>} %></p>', :layout => false
        end
        get '/with_layout' do
          render :erb, '<span>span</span>', :layout => true
        end
      end
      get '/'
      assert ok?
      assert_equal '<p>&lt;script lang=&quot;ronin&quot;&gt;alert(&quot;https://github.com/ronin-ruby/ronin&quot;)&lt;/script&gt;</p>', body

      get '/with_layout'
      assert ok?
      assert_equal 'this is a <span>span</span>', body
    end

    it 'should render unescaped html on == token (Erubis and Erubi)' do
      skip if ENV['ERB_ENGINE'] == 'stdlib'
      mock_app do
        layout do
          "<%= yield %>"
        end

        get "/" do
          render  :erb, '<%== "<script></script>" %>'
        end
      end

      get "/"
      assert ok?
      assert_equal "<script></script>", body
    end

    it 'should render haml to a SafeBuffer' do
      mock_app do
        layout do
          "%p= yield"
        end
        get '/' do
          render :haml, '%p= %s{<script lang="ronin">alert("https://github.com/ronin-ruby/ronin")</script>}', :layout => false
        end
        get '/with_layout' do
          render :haml, "%div\n  foo", :layout => true
        end
      end
      get '/'
      assert ok?
      assert_equal '<p>&lt;script lang=&quot;ronin&quot;&gt;alert(&quot;https://github.com/ronin-ruby/ronin&quot;)&lt;/script&gt;</p>', body.strip

      get 'with_layout'
      assert ok?
      assert_equal '<p><div>foo</div></p>', body.gsub(/\s+/, "")
    end

    it 'should render slim to a SafeBuffer' do
      mock_app do
        layout do
          "p= yield"
        end
        get '/' do
          render :slim, 'p = %q{<script lang="ronin">alert("https://github.com/ronin-ruby/ronin")</script>}', :layout => false
        end
        get "/with_layout" do
          render :slim, 'div foo', :layout => true
        end
      end
      get '/'
      assert ok?
      assert_equal '<p>&lt;script lang=&quot;ronin&quot;&gt;alert(&quot;https://github.com/ronin-ruby/ronin&quot;)&lt;/script&gt;</p>', body.strip

      get '/with_layout'
      assert ok?
      assert_equal '<p><div>foo</div></p>', body.strip
    end

    it 'should render correct erb when use sinatra as middleware' do
      class Bar < Sinatra::Base
        get "/" do
          render :erb, "<&'>"
        end
      end
      mock_app do
        use Bar
      end
      get "/"
      assert_equal "<&'>", body
    end
  end

  describe 'standalone Sinatra usage of Rendering' do
    before do
      Sinatra::Request.class_eval{ alias_method :monkey_controller, :controller; undef :controller }
    end
    after do
      Sinatra::Request.class_eval{ alias_method :controller, :monkey_controller; undef :monkey_controller }
    end
    it 'should work with Sinatra::Base' do
      class Application < Sinatra::Base
        register Padrino::Rendering
        get '/' do
          render :post, :views => File.dirname(__FILE__)+'/fixtures/apps/views/blog'
        end
      end
      @app = Application.new
      get '/'
      assert_equal 'okay', body
    end
  end

  describe 'locating of template paths' do
    it 'should locate controller templates' do
      mock_app do
        disable :reload_templates
        set :views, File.dirname(__FILE__)+'/fixtures/apps/views'
        controller :test do
          get :index do
            render 'test/post'
          end
        end
      end
      get '/test'
    end

    it 'should properly cache template path' do
      mock_app do
        disable :reload_templates
        set :views, File.dirname(__FILE__)+'/fixtures/apps/views'
        controller :blog do
          get :index do
            render :post
          end
        end
        controller :test do
          get :index do
            render 'post'
          end
        end
      end
      get '/blog'
      get '/test'
      assert_equal 'test', body
    end
  end

  describe 'rendering bug in some' do
    it 'should raise error on registering things to Padrino::Application' do
      assert_raises(RuntimeError) do
        Padrino::Application.register Padrino::Rendering
      end
    end
  end

  describe 'sinatra template helpers' do
    it "should respect default_content_type option defined by sinatra" do
      mock_app do
        get(:index){ builder "xml.foo" }
      end
      get '/'
      assert_equal "application/xml;charset=utf-8", response['Content-Type']
    end
  end

  describe 'rendering with helpers that use render' do
    %W{erb haml slim}.each do |engine|
      it "should work with #{engine}" do
        @app = RenderDemo
        get "/double_dive_#{engine}"
        assert_response_has_tag '.outer .wrapper form .inner .core'
      end
    end
  end
end
