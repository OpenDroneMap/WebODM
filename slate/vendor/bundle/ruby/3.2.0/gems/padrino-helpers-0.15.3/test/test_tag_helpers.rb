require File.expand_path(File.dirname(__FILE__) + '/helper')
require File.expand_path(File.dirname(__FILE__) + '/fixtures/markup_app/app')

describe "TagHelpers" do
  def app
    MarkupDemo
  end

  describe 'for #tag method' do
    it 'should support tags with no content no attributes' do
      assert_html_has_tag(tag(:br), :br)
    end

    it 'should support tags with no content with attributes' do
      actual_html = tag(:br, :style => 'clear:both', :class => 'yellow')
      assert_html_has_tag(actual_html, :br, :class => 'yellow', :style=>'clear:both')
    end

    it 'should support selected attribute by using "selected" if true' do
      actual_html = tag(:option, :selected => true)
      # fix nokogiri 1.6.8 on jRuby
      actual_html = content_tag(:select, actual_html)
      assert_html_has_tag(actual_html, 'option', :selected => 'selected')
    end

    it 'should support data attributes' do
      actual_html = tag(:a, :data => { :remote => true, :method => 'post'})
      assert_html_has_tag(actual_html, :a, 'data-remote' => 'true', 'data-method' => 'post')
    end

    it 'should support nested attributes' do
      actual_html = tag(:div, :data => {:dojo => {:type => 'dijit.form.TextBox', :props => 'readOnly: true'}})
      assert_html_has_tag(actual_html, :div, 'data-dojo-type' => 'dijit.form.TextBox', 'data-dojo-props' => 'readOnly: true')
    end

    it 'should support open tags' do
      actual_html = tag(:p, { :class => 'demo' }, true)
      assert_equal "<p class=\"demo\">", actual_html
    end

    it 'should escape html' do
      actual_html = tag(:br, :class => 'Example <foo> & "bar"')
      assert_equal "<br class=\"Example &lt;foo&gt; &amp; &quot;bar&quot;\" />", actual_html
    end

    it 'should allow array as attributes' do
        actual_html = tag(:p, :class => [:foo, :bar])
        assert_html_has_tag(actual_html, 'p.foo.bar')
    end

    it 'should allow array as nested attributes' do
        actual_html = tag(:p, :data => { :foo => [:bar, :baz] })
        assert_html_has_tag(actual_html, 'p', :'data-foo' => 'bar baz')
    end
  end

  describe 'for #content_tag method' do
    it 'should support tags with content as parameter' do
      actual_html = content_tag(:p, "Demo", :class => 'large', :id => 'thing')
      assert_html_has_tag(actual_html, 'p.large#thing', :content => "Demo")
    end

    it 'should support tags with content as block' do
      actual_html = content_tag(:p, :class => 'large', :id => 'star') { "Demo" }
      assert_html_has_tag(actual_html, 'p.large#star', :content => "Demo")
    end

    it 'should escape non-html-safe content' do
      actual_html = content_tag(:p, :class => 'large', :id => 'star') { "<>" }
      assert_html_has_tag(actual_html, 'p.large#star')
      assert_match('&lt;&gt;', actual_html)
    end

    it 'should not escape html-safe content' do
      actual_html = content_tag(:p, :class => 'large', :id => 'star') { "<>" }
      assert_html_has_tag(actual_html, 'p.large#star', :content => "<>")
    end

    it 'should convert to a string if the content is not a string' do
      actual_html = content_tag(:p, 97)
      assert_html_has_tag(actual_html, 'p', :content => "97")
    end

    it 'should support tags with erb' do
      get "/erb/content_tag"
      assert_response_has_tag :p, :content => "Test 1", :class => 'test', :id => 'test1'
      assert_response_has_tag :p, :content => "Test 2"
      assert_response_has_tag :p, :content => "Test 3"
      assert_response_has_tag :p, :content => "Test 4"
      assert_response_has_tag :p, :content => "one"
      assert_response_has_tag :p, :content => "two"
      assert_response_has_no_tag :p, :content => "failed"
    end

    it 'should support tags with haml' do
      get "/haml/content_tag"
      assert_response_has_tag :p, :content => "Test 1", :class => 'test', :id => 'test1'
      assert_response_has_tag :p, :content => "Test 2"
      assert_response_has_tag :p, :content => "Test 3", :class => 'test', :id => 'test3'
      assert_response_has_tag :p, :content => "Test 4"
      assert_response_has_tag :p, :content => "one"
      assert_response_has_tag :p, :content => "two"
      assert_response_has_no_tag :p, :content => "failed"
    end

    it 'should support tags with slim' do
      get "/slim/content_tag"
      assert_response_has_tag :p, :content => "Test 1", :class => 'test', :id => 'test1'
      assert_response_has_tag :p, :content => "Test 2"
      assert_response_has_tag :p, :content => "Test 3", :class => 'test', :id => 'test3'
      assert_response_has_tag :p, :content => "Test 4"
      assert_response_has_tag :p, :content => "one"
      assert_response_has_tag :p, :content => "two"
      assert_response_has_no_tag :p, :content => "failed"
    end
  end

  describe 'for #input_tag method' do
    it 'should support field with type' do
      assert_html_has_tag(input_tag(:text), 'input[type=text]')
    end

    it 'should support field with type and options' do
      actual_html = input_tag(:text, :class => "first", :id => 'texter')
      assert_html_has_tag(actual_html, 'input.first#texter[type=text]')
    end

    it 'should support checked attribute by using "checked" if true' do
      actual_html = input_tag(:checkbox, :checked => true)
      assert_html_has_tag(actual_html, 'input[type=checkbox]', :checked => 'checked')
    end

    it 'should remove checked attribute if false' do
      actual_html = input_tag(:checkbox, :checked => false)
      assert_html_has_no_tag(actual_html, 'input[type=checkbox][checked=false]')
    end

    it 'should support disabled attribute by using "disabled" if true' do
      actual_html = input_tag(:checkbox, :disabled => true)
      assert_html_has_tag(actual_html, 'input[type=checkbox]', :disabled => 'disabled')
    end
  end
end
