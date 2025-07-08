require File.expand_path(File.dirname(__FILE__) + '/helper')
require File.expand_path(File.dirname(__FILE__) + '/fixtures/markup_app/app')

describe "AssetTagHelpers" do
  include Padrino::Helpers::AssetTagHelpers

  def app
    MarkupDemo
  end

  def flash
    @_flash ||= { :notice => "Demo notice" }
  end

  describe 'for #flash_tag method' do
    it 'should display flash with no given attributes' do
      assert_html_has_tag(flash_tag(:notice), 'div.notice', :content => "Demo notice")
    end
    it 'should display flash with given attributes' do
      actual_html = flash_tag(:notice, :class => 'notice', :id => 'notice-area')
      assert_html_has_tag(actual_html, 'div.notice#notice-area', :content => "Demo notice")
    end
    it 'should display multiple flash tags with given attributes' do
      flash[:error] = 'wrong'
      flash[:success] = 'okey'
      actual_html = flash_tag(:success, :warning, :error, :id => 'area')
      assert_html_has_tag(actual_html, 'div.success#area', :content => flash[:success])
      assert_html_has_tag(actual_html, 'div.error#area', :content => flash[:error])
      assert_html_has_no_tag(actual_html, 'div.warning')
    end
  end

  describe 'for #link_to method' do
    it 'should display link element with no given attributes' do
      assert_html_has_tag(link_to('Sign up', '/register'), 'a', :content => "Sign up", :href => '/register')
    end

    it 'should display link element with given attributes' do
      actual_html = link_to('Sign up', '/register', :class => 'first', :id => 'linky')
      assert_html_has_tag(actual_html, 'a#linky.first', :content => "Sign up", :href => '/register')
    end

    it 'should display link element with void url and options' do
      actual_link = link_to('Sign up', :class => "test")
      assert_html_has_tag(actual_link, 'a', :content => "Sign up", :href => '#', :class => 'test')
    end

    it 'should display link element with remote option' do
      actual_link = link_to('Sign up', '/register', :remote => true)
      assert_html_has_tag(actual_link, 'a', :content => "Sign up", :href => '/register', 'data-remote' => 'true')
    end

    it 'should display link element with method option' do
      actual_link = link_to('Sign up', '/register', :method => :delete)
      assert_html_has_tag(actual_link, 'a', :content => "Sign up", :href => '/register', 'data-method' => 'delete', :rel => 'nofollow')
    end

    it 'should display link element with confirm option' do
      actual_link = link_to('Sign up', '/register', :confirm => "Are you sure?")
      assert_html_has_tag(actual_link, 'a', :content => "Sign up", :href => '/register', 'data-confirm' => 'Are you sure?')
    end

    it 'should display link element with ruby block' do
      actual_link = link_to('/register', :class => 'first', :id => 'binky') { "Sign up" }
      assert_html_has_tag(actual_link, 'a#binky.first', :content => "Sign up", :href => '/register')
    end

    it 'should escape the link text' do
      actual_link = link_to('/register', :class => 'first', :id => 'binky') { "<&>" }
      assert_html_has_tag(actual_link, 'a#binky.first', :href => '/register')
      assert_match "&lt;&amp;&gt;", actual_link
    end

    it 'should escape the link href' do
      actual_link = link_to('Sign up', '/register new%20user')
      assert_html_has_tag(actual_link, 'a', :href => '/register%20new%20user')
    end

    it 'should not escape image_tag' do
      actual_link = link_to(image_tag("/my/fancy/image.png"), :class => 'first', :id => 'binky')
      assert_html_has_tag(actual_link, 'img', :src => "/my/fancy/image.png")
    end

    it 'should render alt text by default' do
      actual_tag = image_tag("/my/fancy/image.png")
      assert_html_has_tag(actual_tag, 'img', :src => "/my/fancy/image.png", :alt => "Image")
    end

    it 'should render humanized alt text' do
      actual_tag = image_tag("/my/fancy/image_white.png")
      assert_html_has_tag(actual_tag, 'img', :src => "/my/fancy/image_white.png", :alt => "Image white")
    end

    it 'should remove hash value from src path' do
      actual_tag = image_tag("/my/fancy/sprite-47bce5c74f589f4867dbd57e9ca9f808.png")
      assert_html_has_tag(actual_tag, 'img', :src => "/my/fancy/sprite-47bce5c74f589f4867dbd57e9ca9f808.png", :alt => "Sprite")
    end

    it 'should display link block element in haml' do
      get "/haml/link_to"
      assert_response_has_tag :a, :content => "Test 1 No Block", :href => '/test1', :class => 'test', :id => 'test1'
      assert_response_has_tag :a, :content => "Test 2 With Block", :href => '/test2', :class => 'test', :id => 'test2'
    end

    it 'should display link block element in erb' do
      get "/erb/link_to"
      assert_response_has_tag :a, :content => "Test 1 No Block", :href => '/test1', :class => 'test', :id => 'test1'
      assert_response_has_tag :a, :content => "Test 2 With Block", :href => '/test2', :class => 'test', :id => 'test2'
    end

    it 'should display link block element in slim' do
      get "/slim/link_to"
      assert_response_has_tag :a, :content => "Test 1 No Block", :href => '/test1', :class => 'test', :id => 'test1'
      assert_response_has_tag :a, :content => "Test 2 With Block", :href => '/test2', :class => 'test', :id => 'test2'
    end

    it 'should not double-escape' do
      actual_link = link_to('test escape', '?a=1&b=2')
      assert_html_has_tag(actual_link, 'a', :href => '?a=1&b=2')
      assert_match %r{&amp;}, actual_link
      refute_match %r{&amp;amp;}, actual_link
    end

    it 'should escape scary things' do
      actual_link = link_to('test escape<adfs>', '?a=1&b=<script>alert(1)</script>')
      refute_match('<script', actual_link)
    end
  end

  describe 'for #mail_to method' do
    it 'should display link element for mail to no caption' do
      actual_html = mail_to('test@demo.com')
      assert_html_has_tag(actual_html, :a, :href => "mailto:test@demo.com", :content => 'test@demo.com')
    end

    it 'should display link element for mail to with caption' do
      actual_html = mail_to('test@demo.com', "My Email", :class => 'demo')
      assert_html_has_tag(actual_html, :a, :href => "mailto:test@demo.com", :content => 'My Email', :class => 'demo')
    end

    it 'should display link element for mail to with caption and mail options' do
      actual_html = mail_to('test@demo.com', "My Email", :subject => 'demo test', :class => 'demo', :cc => 'foo@test.com')
      assert_html_has_tag(actual_html, :a, :class => 'demo')
      assert_match %r{mailto\:test\@demo.com\?}, actual_html
      assert_match %r{cc=foo\@test\.com}, actual_html
      assert_match %r{subject\=demo\%20test}, actual_html
    end

    it 'should escape & with encoded string and &amp; in HTML' do
      actual_html = mail_to('test@demo.com', "My&Email", :subject => "this&that")
      assert_match 'this%26that', actual_html
      assert_match 'My&amp;Email', actual_html
    end

    it 'should not double-escape ampersands in query' do
      actual_html = mail_to('to@demo.com', "Email", :bcc => 'bcc@test.com', :subject => 'Hi there')
      assert_html_has_tag(actual_html, :a, :href => 'mailto:to@demo.com?bcc=bcc@test.com&subject=Hi%20there', :content => 'Email')
      assert_match %r{&amp;}, actual_html
      refute_match %r{&amp;amp;}, actual_html
    end

    it 'should display mail link element in haml' do
      get "/haml/mail_to"
      assert_response_has_tag 'p.simple a', :href => 'mailto:test@demo.com', :content => 'test@demo.com'
      assert_response_has_tag 'p.captioned a', :href => 'mailto:test@demo.com', :content => 'Click my Email'
    end

    it 'should display mail link element in erb' do
      get "/erb/mail_to"
      assert_response_has_tag 'p.simple a', :href => 'mailto:test@demo.com', :content => 'test@demo.com'
      assert_response_has_tag 'p.captioned a', :href => 'mailto:test@demo.com', :content => 'Click my Email'
    end

    it 'should display mail link element in slim' do
      get "/slim/mail_to"
      assert_response_has_tag 'p.simple a', :href => 'mailto:test@demo.com', :content => 'test@demo.com'
      assert_response_has_tag 'p.captioned a', :href => 'mailto:test@demo.com', :content => 'Click my Email'
    end
  end

  describe 'for #meta_tag method' do
    it 'should display meta tag with given content and name' do
      actual_html = meta_tag("weblog,news", :name => "keywords")
      assert_html_has_tag(actual_html, "meta", :name => "keywords", :content => "weblog,news")
    end

    it 'should display meta tag with given content and http-equiv' do
      actual_html = meta_tag("text/html; charset=UTF-8", :"http-equiv" => "Content-Type")
      assert_html_has_tag(actual_html, "meta", :"http-equiv" => "Content-Type", :content => "text/html; charset=UTF-8")
    end

    it 'should display meta tag element in haml' do
      get "/haml/meta_tag"
      assert_response_has_tag 'meta', :content => "weblog,news", :name => "keywords"
      assert_response_has_tag 'meta', :content => "text/html; charset=UTF-8", :"http-equiv" => "Content-Type"
    end

    it 'should display meta tag element in erb' do
      get "/erb/meta_tag"
      assert_response_has_tag 'meta', :content => "weblog,news", :name => "keywords"
      assert_response_has_tag 'meta', :content => "text/html; charset=UTF-8", :"http-equiv" => "Content-Type"
    end

    it 'should display meta tag element in slim' do
      get "/slim/meta_tag"
      assert_response_has_tag 'meta', :content => "weblog,news", :name => "keywords"
      assert_response_has_tag 'meta', :content => "text/html; charset=UTF-8", :"http-equiv" => "Content-Type"
    end
  end

  describe 'for #image_tag method' do
    it 'should display image tag absolute link with no options' do
      assert_html_has_tag(image_tag('/absolute/pic.gif'), 'img', :src => "/absolute/pic.gif")
    end

    it 'should display image tag relative link with specified uri root' do
      time = stop_time_for_test
      self.class.stubs(:uri_root).returns("/blog")
      assert_html_has_tag(image_tag('relative/pic.gif'), 'img', :src => "/blog/images/relative/pic.gif?#{time.to_i}")
    end

    it 'should display image tag relative link with options' do
      time = stop_time_for_test
      assert_html_has_tag(image_tag('relative/pic.gif', :class => 'photo'), 'img.photo', :src => "/images/relative/pic.gif?#{time.to_i}")
    end

    it 'should display image tag uri link with options' do
      assert_html_has_tag(image_tag('http://demo.org/pic.gif', :class => 'photo'), 'img.photo', :src => "http://demo.org/pic.gif")
    end

    it 'should display image tag relative link with incorrect spacing' do
      time = stop_time_for_test
      assert_html_has_tag(image_tag(' relative/ pic.gif  ', :class => 'photo'), 'img.photo', :src => "/images/%20relative/%20pic.gif%20%20?#{time.to_i}")
    end

    it 'should not use a timestamp if stamp setting is false' do
      assert_html_has_tag(image_tag('/absolute/pic.gif'), 'img', :src => "/absolute/pic.gif")
    end

    it 'should have xhtml convention tag' do
      assert_equal image_tag('/absolute/pic.gif'), '<img src="/absolute/pic.gif" alt="Pic" />'
    end
  end

  describe 'for #stylesheet_link_tag method' do
    it 'should display stylesheet link item' do
      time = stop_time_for_test
      actual_html = stylesheet_link_tag('style')
      expected_options = { :rel => "stylesheet", :type => "text/css" }
      assert_html_has_tag(actual_html, 'link', expected_options.merge(:href => "/stylesheets/style.css?#{time.to_i}"))
      assert actual_html.html_safe?
    end

    it 'should display stylesheet link item for long relative path' do
      time = stop_time_for_test
      expected_options = { :rel => "stylesheet", :type => "text/css" }
      actual_html = stylesheet_link_tag('example/demo/style')
      assert_html_has_tag(actual_html, 'link', expected_options.merge(:href => "/stylesheets/example/demo/style.css?#{time.to_i}"))
    end

    it 'should display stylesheet link item with absolute path' do
      time = stop_time_for_test
      expected_options = { :rel => "stylesheet", :type => "text/css" }
      actual_html = stylesheet_link_tag('/css/style')
      assert_html_has_tag(actual_html, 'link', expected_options.merge(:href => "/css/style.css"))
    end

    it 'should display stylesheet link item with uri root' do
      self.class.stubs(:uri_root).returns("/blog")
      time = stop_time_for_test
      expected_options = { :rel => "stylesheet", :type => "text/css" }
      actual_html = stylesheet_link_tag('style')
      assert_html_has_tag(actual_html, 'link', expected_options.merge(:href => "/blog/stylesheets/style.css?#{time.to_i}"))
    end

    it 'should display stylesheet link items' do
      time = stop_time_for_test
      actual_html = stylesheet_link_tag('style', 'layout.css', 'http://google.com/style.css')
      assert_html_has_tag(actual_html, 'link', :rel => "stylesheet", :type => "text/css", :count => 3)
      assert_html_has_tag(actual_html, 'link', :href => "/stylesheets/style.css?#{time.to_i}")
      assert_html_has_tag(actual_html, 'link', :href => "/stylesheets/layout.css?#{time.to_i}")
      assert_html_has_tag(actual_html, 'link', :href => "http://google.com/style.css")
      assert_equal actual_html, stylesheet_link_tag(['style', 'layout.css', 'http://google.com/style.css'])
    end

    it 'should not use a timestamp if stamp setting is false' do
      self.class.expects(:asset_stamp).returns(false)
      expected_options = { :rel => "stylesheet", :type => "text/css" }
      assert_html_has_tag(stylesheet_link_tag('style'), 'link', expected_options.merge(:href => "/stylesheets/style.css"))
    end

    it 'should display stylesheet link used custom options' do
      assert_html_has_tag(stylesheet_link_tag('style', :media => 'screen'), 'link', :rel => 'stylesheet', :media => 'screen')
    end
  end

  describe 'for #javascript_include_tag method' do
    it 'should display javascript item' do
      time = stop_time_for_test
      actual_html = javascript_include_tag('application')
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/application.js?#{time.to_i}", :type => "text/javascript")
      assert actual_html.html_safe?
    end

    it 'should respond to js_asset_folder setting' do
      time = stop_time_for_test
      self.class.stubs(:js_asset_folder).returns('js')
      assert_equal 'js', asset_folder_name(:js)
      actual_html = javascript_include_tag('application')
      assert_html_has_tag(actual_html, 'script', :src => "/js/application.js?#{time.to_i}", :type => "text/javascript")
    end

    it 'should display javascript item for long relative path' do
      time = stop_time_for_test
      actual_html = javascript_include_tag('example/demo/application')
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/example/demo/application.js?#{time.to_i}", :type => "text/javascript")
    end

    it 'should display javascript item for path containing js' do
      time = stop_time_for_test
      actual_html = javascript_include_tag 'test/jquery.json'
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/test/jquery.json?#{time.to_i}", :type => "text/javascript")
    end

    it 'should display javascript item for path containing period' do
      time = stop_time_for_test
      actual_html = javascript_include_tag 'test/jquery.min'
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/test/jquery.min.js?#{time.to_i}", :type => "text/javascript")
    end

    it 'should display javascript item with absolute path' do
      actual_html = javascript_include_tag('/js/application')
      assert_html_has_tag(actual_html, 'script', :src => "/js/application.js", :type => "text/javascript")
    end

    it 'should display javascript item with uri root' do
      self.class.stubs(:uri_root).returns("/blog")
      time = stop_time_for_test
      actual_html = javascript_include_tag('application')
      assert_html_has_tag(actual_html, 'script', :src => "/blog/javascripts/application.js?#{time.to_i}", :type => "text/javascript")
    end

    it 'should not append extension to absolute paths' do
      actual_html = javascript_include_tag('https://maps.googleapis.com/maps/api/js?key=value&sensor=false')
      assert_html_has_tag(actual_html, 'script', :src => "https://maps.googleapis.com/maps/api/js?key=value&sensor=false")
    end

    it 'should display javascript items' do
      time = stop_time_for_test
      actual_html = javascript_include_tag('application', 'base.js', 'http://google.com/lib.js')
      assert_html_has_tag(actual_html, 'script', :type => "text/javascript", :count => 3)
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/application.js?#{time.to_i}")
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/base.js?#{time.to_i}")
      assert_html_has_tag(actual_html, 'script', :src => "http://google.com/lib.js")
      assert_equal actual_html, javascript_include_tag(['application', 'base.js', 'http://google.com/lib.js'])
    end

    it 'should not use a timestamp if stamp setting is false' do
      self.class.expects(:asset_stamp).returns(false)
      actual_html = javascript_include_tag('application')
      assert_html_has_tag(actual_html, 'script', :src => "/javascripts/application.js", :type => "text/javascript")
    end
  end

  describe "for #favicon_tag method" do
    it 'should display favicon' do
      time = stop_time_for_test
      actual_html = favicon_tag('icons/favicon.png')
      assert_html_has_tag(actual_html, 'link', :rel => 'icon', :type => 'image/png', :href => "/images/icons/favicon.png?#{time.to_i}")
    end

    it 'should match type with file ext' do
      time = stop_time_for_test
      actual_html = favicon_tag('favicon.ico')
      assert_html_has_tag(actual_html, 'link', :rel => 'icon', :type => 'image/ico', :href => "/images/favicon.ico?#{time.to_i}")
    end

    it 'should allow option overrides' do
      time = stop_time_for_test
      actual_html = favicon_tag('favicon.png', :type => 'image/ico')
      assert_html_has_tag(actual_html, 'link', :rel => 'icon', :type => 'image/ico', :href => "/images/favicon.png?#{time.to_i}")
    end
  end

  describe 'for #feed_tag method' do
    it 'should generate correctly link tag for rss' do
      assert_html_has_tag(feed_tag(:rss, "/blog/post.rss"), 'link', :type => 'application/rss+xml', :rel => 'alternate', :href => "/blog/post.rss", :title => 'rss')
    end

    it 'should generate correctly link tag for atom' do
      assert_html_has_tag(feed_tag(:atom, "/blog/post.atom"), 'link', :type => 'application/atom+xml', :rel => 'alternate', :href => "/blog/post.atom", :title => 'atom')
    end

    it 'should override options' do
      assert_html_has_tag(feed_tag(:rss, "/blog/post.rss", :type => "my-type", :rel => "my-rel", :title => "my-title"), 'link', :type => 'my-type', :rel => 'my-rel', :href => "/blog/post.rss", :title => 'my-title')
    end
  end

  describe 'for #asset_path method' do
    it 'should generate proper paths for js and css' do
      assert_match /\/javascripts\/app.js\?\d+/, asset_path(:js, 'app')
      assert_match /\/stylesheets\/app.css\?\d+/, asset_path(:css, 'app')
    end

    it 'should generate proper paths for images and other files' do
      assert_match /\/images\/app.png\?\d+/, asset_path(:images, 'app.png')
      assert_match /\/documents\/app.pdf\?\d+/, asset_path(:documents, 'app.pdf')
    end

    it 'should generate proper paths for public folder' do
      assert_match /\/files\/file.ext\?\d+/, asset_path('files/file.ext')
    end
  end
end
