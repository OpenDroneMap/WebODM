require File.expand_path(File.dirname(__FILE__) + '/helper')
require File.expand_path(File.dirname(__FILE__) + '/fixtures/markup_app/app')

describe "FormHelpers" do
  include Padrino::Helpers::FormHelpers

  def app
    MarkupDemo
  end

  class UnprotectedApp
    def protect_from_csrf; false; end
  end

  describe 'for #form_tag method' do
    it 'should display correct forms in ruby' do
      actual_html = form_tag('/register', :"accept-charset" => "UTF-8", :class => 'test', :method => "post") { "Demo" }
      assert_html_has_tag(actual_html, :form, :"accept-charset" => "UTF-8", :class => "test")
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => '_method', :count => 0)
    end

    it 'should display correct text inputs within form_tag' do
      actual_html = form_tag('/register', :"accept-charset" => "UTF-8", :class => 'test') { text_field_tag(:username) }
      assert_html_has_tag(actual_html, 'form input', :type => 'text', :name => "username")
      assert_html_has_no_tag(actual_html, 'form input', :type => 'hidden', :name => "_method")
    end

    it 'should display correct form with remote' do
      actual_html = form_tag('/update', :"accept-charset" => "UTF-8", :class => 'put-form', :remote => true) { "Demo" }
      assert_html_has_tag(actual_html, :form, :class => "put-form", :"accept-charset" => "UTF-8", :"data-remote" => 'true')
      assert_html_has_no_tag(actual_html, :form, "data-method" => 'post')
    end

    it 'should display correct form with remote and method is put' do
      actual_html = form_tag('/update', :"accept-charset" => "UTF-8", :method => 'put', :remote => true) { "Demo" }
      assert_html_has_tag(actual_html, :form, "data-remote" => 'true', :"accept-charset" => "UTF-8")
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'put')
    end

    it 'should display correct form with method :put' do
      actual_html = form_tag('/update', :"accept-charset" => "UTF-8", :class => 'put-form', :method => "put") { "Demo" }
      assert_html_has_tag(actual_html, :form, :class => "put-form", :"accept-charset" => "UTF-8", :method => 'post')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'put')
    end

    it 'should display correct form with method :delete and charset' do
      actual_html = form_tag('/remove', :"accept-charset" => "UTF-8", :class => 'delete-form', :method => "delete") { "Demo" }
      assert_html_has_tag(actual_html, :form, :class => "delete-form", :"accept-charset" => "UTF-8", :method => 'post')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'delete')
    end

    it 'should display correct form with charset' do
      actual_html = form_tag('/charset', :"accept-charset" => "UTF-8", :class => 'charset-form') { "Demo" }
      assert_html_has_tag(actual_html, :form, :class => "charset-form", :"accept-charset" => "UTF-8", :method => 'post')
    end

    it 'should display correct form with multipart encoding' do
      actual_html = form_tag('/remove', :"accept-charset" => "UTF-8", :multipart => true) { "Demo" }
      assert_html_has_tag(actual_html, :form, :enctype => "multipart/form-data")
    end

    it 'should have an authenticity_token for method :post, :put or :delete' do
      %w(post put delete).each do |method|
        actual_html = form_tag('/modify', :method => method) { "Demo" }
        assert_html_has_tag(actual_html, :input, :name => 'authenticity_token')
      end
    end

    it 'should not have an authenticity_token if method: :get' do
      actual_html = form_tag('/get', :method => :get) { "Demo" }
      assert_html_has_no_tag(actual_html, :input, :name => 'authenticity_token')
    end

    it 'should have an authenticity_token by default' do
      actual_html = form_tag('/superadmindelete') { "Demo" }
      assert_html_has_tag(actual_html, :input, :name => 'authenticity_token')
    end

    it 'should create csrf meta tags with token and param - #csrf_meta_tags' do
      actual_html = csrf_meta_tags
      assert_html_has_tag(actual_html, :meta, :name => 'csrf-param')
      assert_html_has_tag(actual_html, :meta, :name => 'csrf-token')
    end

    it 'should have an authenticity_token by default' do
      actual_html = form_tag('/superadmindelete') { "Demo" }
      assert_html_has_tag(actual_html, :input, :name => 'authenticity_token')
    end

    it 'should not have an authenticity_token if passing protect_from_csrf: false' do
      actual_html = form_tag('/superadmindelete', :protect_from_csrf => false) { "Demo" }
      assert_html_has_no_tag(actual_html, :input, :name => 'authenticity_token')
    end

    it 'should not have an authenticity_token if protect_from_csrf is false on app settings' do
      self.expects(:settings).returns(UnprotectedApp.new)
      actual_html = form_tag('/superadmindelete') { "Demo" }
      assert_html_has_no_tag(actual_html, :input, :name => 'authenticity_token')
    end

    it 'should not include protect_from_csrf as an attribute of form element' do
      actual_html = form_tag('/superadmindelete', :protect_from_csrf => true){ "Demo" }
      assert_html_has_no_tag(actual_html, :form, protect_from_csrf: "true")
    end

    it 'should display correct forms in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form', :action => '/simple'
      assert_response_has_tag 'form.advanced-form', :action => '/advanced', :id => 'advanced', :method => 'get'
      assert_response_has_tag 'form.simple-form input', :name => 'authenticity_token'
      assert_response_has_no_tag 'form.no-protection input', :name => 'authenticity_token'
    end

    it 'should display correct forms in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form', :action => '/simple'
      assert_response_has_tag 'form.advanced-form', :action => '/advanced', :id => 'advanced', :method => 'get'
      assert_response_has_tag 'form.simple-form input', :name => 'authenticity_token'
      assert_response_has_no_tag 'form.no-protection input', :name => 'authenticity_token'
    end

    it 'should display correct forms in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form', :action => '/simple'
      assert_response_has_tag 'form.advanced-form', :action => '/advanced', :id => 'advanced', :method => 'get'
      assert_response_has_tag 'form.simple-form input', :name => 'authenticity_token'
      assert_response_has_no_tag 'form.no-protection input', :name => 'authenticity_token'
    end
  end

  describe 'for #field_set_tag method' do
    it 'should display correct field_sets in ruby' do
      actual_html = field_set_tag("Basic", :class => 'basic') { "Demo" }
      assert_html_has_tag(actual_html, :fieldset, :class => 'basic')
      assert_html_has_tag(actual_html, 'fieldset legend', :content => "Basic")
    end

    it 'should display correct field_sets in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form fieldset', :count => 1
      assert_response_has_no_tag 'form.simple-form fieldset legend'
      assert_response_has_tag 'form.advanced-form fieldset', :count => 1, :class => 'advanced-field-set'
      assert_response_has_tag 'form.advanced-form fieldset legend', :content => "Advanced"
    end

    it 'should display correct field_sets in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form fieldset', :count => 1
      assert_response_has_no_tag 'form.simple-form fieldset legend'
      assert_response_has_tag 'form.advanced-form fieldset', :count => 1, :class => 'advanced-field-set'
      assert_response_has_tag 'form.advanced-form fieldset legend', :content => "Advanced"
    end

    it 'should display correct field_sets in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form fieldset', :count => 1
      assert_response_has_no_tag 'form.simple-form fieldset legend'
      assert_response_has_tag 'form.advanced-form fieldset', :count => 1, :class => 'advanced-field-set'
      assert_response_has_tag 'form.advanced-form fieldset legend', :content => "Advanced"
    end
  end

  describe 'for #error_messages_for method' do
    it 'should display correct error messages list in ruby' do
      user = mock_model("User", :errors => { :a => "1", :b => "2" })
      actual_html = error_messages_for(user)
      assert_html_has_tag(actual_html, 'div.field-errors')
      assert_html_has_tag(actual_html, 'div.field-errors h2', :content => "2 errors prohibited this User from being saved")
      assert_html_has_tag(actual_html, 'div.field-errors p', :content => "There were problems with the following fields:")
      assert_html_has_tag(actual_html, 'div.field-errors ul')
      assert_html_has_tag(actual_html, 'div.field-errors ul li', :count => 2)
    end

    it 'should display correct error messages list in erb' do
      get "/erb/form_tag"
      assert_response_has_no_tag 'form.simple-form .field-errors'
      assert_response_has_tag 'form.advanced-form .field-errors'
      assert_response_has_tag 'form.advanced-form .field-errors h2', :content => "There are problems with saving user!"
      assert_response_has_tag 'form.advanced-form .field-errors p', :content => "There were problems with the following fields:"
      assert_response_has_tag 'form.advanced-form .field-errors ul'
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :count => 4
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Email must be an email"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Fake must be valid"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Second must be present"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Third must be a number"
    end

    it 'should display correct error messages list in haml' do
      get "/haml/form_tag"
      assert_response_has_no_tag 'form.simple-form .field-errors'
      assert_response_has_tag 'form.advanced-form .field-errors'
      assert_response_has_tag 'form.advanced-form .field-errors h2', :content => "There are problems with saving user!"
      assert_response_has_tag 'form.advanced-form .field-errors p',  :content => "There were problems with the following fields:"
      assert_response_has_tag 'form.advanced-form .field-errors ul'
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :count => 4
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Email must be an email"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Fake must be valid"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Second must be present"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Third must be a number"
    end

    it 'should display correct error messages list in slim' do
      get "/slim/form_tag"
      assert_response_has_no_tag 'form.simple-form .field-errors'
      assert_response_has_tag 'form.advanced-form .field-errors'
      assert_response_has_tag 'form.advanced-form .field-errors h2', :content => "There are problems with saving user!"
      assert_response_has_tag 'form.advanced-form .field-errors p',  :content => "There were problems with the following fields:"
      assert_response_has_tag 'form.advanced-form .field-errors ul'
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :count => 4
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Email must be an email"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Fake must be valid"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Second must be present"
      assert_response_has_tag 'form.advanced-form .field-errors ul li', :content => "Third must be a number"
    end
  end

  describe 'for #error_message_on method' do
    it 'should display correct error message on specified model name in ruby' do
      @user = mock_model("User", :errors => { :a => "1", :b => "2" })
      actual_html = error_message_on(:user, :a, :prepend => "foo", :append => "bar")
      assert_html_has_tag(actual_html, 'span.error', :content => "foo 1 bar")
    end

    it 'should display correct error message on specified object in ruby' do
      @bob = mock_model("User", :errors => { :a => "1", :b => "2" })
      actual_html = error_message_on(@bob, :a, :prepend => "foo", :append => "bar")
      assert_html_has_tag(actual_html, 'span.error', :content => "foo 1 bar")
    end

    it 'should display no message when error is not present' do
      @user = mock_model("User", :errors => { :a => "1", :b => "2" })
      actual_html = error_message_on(:user, :fake, :prepend => "foo", :append => "bar")
      assert_empty actual_html
    end

    it 'should display no message when error is not present in an Array' do
      @user = mock_model("User", :errors => { :a => [], :b => "2" })
      actual_html = error_message_on(:user, :a, :prepend => "foo", :append => "bar")
      assert_empty actual_html
    end
  end

  describe 'for #label_tag method' do
    it 'should display label tag in ruby' do
      actual_html = label_tag(:username, :class => 'long-label', :caption => "Nickname")
      assert_html_has_tag(actual_html, :label, :for => 'username', :class => 'long-label', :content => "Nickname")
    end

    it 'should display label tag in ruby with required' do
      actual_html = label_tag(:username, :caption => "Nickname", :required => true)
      assert_html_has_tag(actual_html, :label, :for => 'username', :content => 'Nickname')
      assert_html_has_tag(actual_html, 'label[for=username] span.required', :content => "*")
    end

    it 'should display label tag in ruby with a block' do
      actual_html = label_tag(:admin, :class => 'long-label') { input_tag :checkbox }
      assert_html_has_tag(actual_html, :label, :for => 'admin', :class => 'long-label', :content => "Admin")
      assert_html_has_tag(actual_html, 'label input[type=checkbox]')
    end

    it 'should display label tag in erb for simple form' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form label', :count => 9
      assert_response_has_tag 'form.simple-form label', :content => "Username", :for => 'username'
      assert_response_has_tag 'form.simple-form label', :content => "Password", :for => 'password'
      assert_response_has_tag 'form.simple-form label', :content => "Gender", :for => 'gender'
    end

    it 'should display label tag in erb for advanced form' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.advanced-form label', :count => 11
      assert_response_has_tag 'form.advanced-form label.first', :content => "Nickname", :for => 'username'
      assert_response_has_tag 'form.advanced-form label.first', :content => "Password", :for => 'password'
      assert_response_has_tag 'form.advanced-form label.about', :content => "About Me", :for => 'about'
      assert_response_has_tag 'form.advanced-form label.photo', :content => "Photo"   , :for => 'photo'
      assert_response_has_tag 'form.advanced-form label.gender', :content => "Gender"   , :for => 'gender'
    end

    it 'should display label tag in haml for simple form' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form label', :count => 9
      assert_response_has_tag 'form.simple-form label', :content => "Username", :for => 'username'
      assert_response_has_tag 'form.simple-form label', :content => "Password", :for => 'password'
      assert_response_has_tag 'form.simple-form label', :content => "Gender", :for => 'gender'
    end

    it 'should display label tag in haml for advanced form' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.advanced-form label', :count => 11
      assert_response_has_tag 'form.advanced-form label.first', :content => "Nickname", :for => 'username'
      assert_response_has_tag 'form.advanced-form label.first', :content => "Password", :for => 'password'
      assert_response_has_tag 'form.advanced-form label.about', :content => "About Me", :for => 'about'
      assert_response_has_tag 'form.advanced-form label.photo', :content => "Photo"   , :for => 'photo'
      assert_response_has_tag 'form.advanced-form label.gender', :content => "Gender"   , :for => 'gender'
    end

    it 'should display label tag in slim for simple form' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form label', :count => 9
      assert_response_has_tag 'form.simple-form label', :content => "Username", :for => 'username'
      assert_response_has_tag 'form.simple-form label', :content => "Password", :for => 'password'
      assert_response_has_tag 'form.simple-form label', :content => "Gender", :for => 'gender'
    end

    it 'should display label tag in slim for advanced form' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.advanced-form label', :count => 11
      assert_response_has_tag 'form.advanced-form label.first', :content => "Nickname", :for => 'username'
      assert_response_has_tag 'form.advanced-form label.first', :content => "Password", :for => 'password'
      assert_response_has_tag 'form.advanced-form label.about', :content => "About Me", :for => 'about'
      assert_response_has_tag 'form.advanced-form label.photo', :content => "Photo"   , :for => 'photo'
      assert_response_has_tag 'form.advanced-form label.gender', :content => "Gender"   , :for => 'gender'
    end
  end

  describe 'for #hidden_field_tag method' do
    it 'should display hidden field in ruby' do
      actual_html = hidden_field_tag(:session_key, :id => 'session_id', :value => '56768')
      assert_html_has_tag(actual_html, :input, :type => 'hidden', :id => "session_id", :name => 'session_key', :value => '56768')
    end

    it 'should display hidden field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=hidden]', :count => 1, :name => 'session_id', :value => "__secret__"
      assert_response_has_tag 'form.advanced-form input[type=hidden]', :count => 1, :name => 'session_id', :value => "__secret__"
    end

    it 'should display hidden field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=hidden]', :count => 1, :name => 'session_id', :value => "__secret__"
      assert_response_has_tag 'form.advanced-form input[type=hidden]', :count => 1, :name => 'session_id', :value => "__secret__"
    end

    it 'should display hidden field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=hidden]', :count => 1, :name => 'session_id', :value => "__secret__"
      assert_response_has_tag 'form.advanced-form input[type=hidden]', :count => 1, :name => 'session_id', :value => "__secret__"
    end
  end

  describe 'for #text_field_tag method' do
    it 'should display text field in ruby' do
      actual_html = text_field_tag(:username, :class => 'long')
      assert_html_has_tag(actual_html, :input, :type => 'text', :class => "long", :name => 'username')
    end

    it 'should display text field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=text]', :count => 1, :name => 'username'
      assert_response_has_tag 'form.advanced-form fieldset input[type=text]', :count => 1, :name => 'username', :id => 'the_username'
    end

    it 'should display text field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=text]', :count => 1, :name => 'username'
      assert_response_has_tag 'form.advanced-form fieldset input[type=text]', :count => 1, :name => 'username', :id => 'the_username'
    end

    it 'should display text field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=text]', :count => 1, :name => 'username'
      assert_response_has_tag 'form.advanced-form fieldset input[type=text]', :count => 1, :name => 'username', :id => 'the_username'
    end
  end

  describe 'for #number_field_tag method' do
    it 'should display number field in ruby' do
      actual_html = number_field_tag(:age, :class => 'numeric')
      assert_html_has_tag(actual_html, :input, :type => 'number', :class => 'numeric', :name => 'age')
    end

    it 'should display number field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=number]', :count => 1, :name => 'age'
      assert_response_has_tag 'form.advanced-form fieldset input[type=number]', :count => 1, :name => 'age', :class => 'numeric'
    end

    it 'should display number field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=number]', :count => 1, :name => 'age'
      assert_response_has_tag 'form.advanced-form fieldset input[type=number]', :count => 1, :name => 'age', :class => 'numeric'
    end

    it 'should display number field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=number]', :count => 1, :name => 'age'
      assert_response_has_tag 'form.advanced-form fieldset input[type=number]', :count => 1, :name => 'age', :class => 'numeric'
    end
  end

  describe 'for #telephone_field_tag method' do
    it 'should display number field in ruby' do
      actual_html = telephone_field_tag(:telephone, :class => 'numeric')
      assert_html_has_tag(actual_html, :input, :type => 'tel', :class => 'numeric', :name => 'telephone')
    end

    it 'should display telephone field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=tel]', :count => 1, :name => 'telephone'
      assert_response_has_tag 'form.advanced-form fieldset input[type=tel]', :count => 1, :name => 'telephone', :class => 'numeric'
    end

    it 'should display telephone field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=tel]', :count => 1, :name => 'telephone'
      assert_response_has_tag 'form.advanced-form fieldset input[type=tel]', :count => 1, :name => 'telephone', :class => 'numeric'
    end

    it 'should display telephone field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=tel]', :count => 1, :name => 'telephone'
      assert_response_has_tag 'form.advanced-form fieldset input[type=tel]', :count => 1, :name => 'telephone', :class => 'numeric'
    end
  end

  describe 'for #search_field_tag method' do
    it 'should display search field in ruby' do
      actual_html = search_field_tag(:search, :class => 'string')
      assert_html_has_tag(actual_html, :input, :type => 'search', :class => 'string', :name => 'search')
    end

    it 'should display search field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=search]', :count => 1, :name => 'search'
      assert_response_has_tag 'form.advanced-form fieldset input[type=search]', :count => 1, :name => 'search', :class => 'string'
    end

    it 'should display search field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=search]', :count => 1, :name => 'search'
      assert_response_has_tag 'form.advanced-form fieldset input[type=search]', :count => 1, :name => 'search', :class => 'string'
    end

    it 'should display search field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=search]', :count => 1, :name => 'search'
      assert_response_has_tag 'form.advanced-form fieldset input[type=search]', :count => 1, :name => 'search', :class => 'string'
    end
  end

  describe 'for #email_field_tag method' do
    it 'should display email field in ruby' do
      actual_html = email_field_tag(:email, :class => 'string')
      assert_html_has_tag(actual_html, :input, :type => 'email', :class => 'string', :name => 'email')
    end

    it 'should display email field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=email]', :count => 1, :name => 'email'
      assert_response_has_tag 'form.advanced-form fieldset input[type=email]', :count => 1, :name => 'email', :class => 'string'
    end

    it 'should display email field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=email]', :count => 1, :name => 'email'
      assert_response_has_tag 'form.advanced-form fieldset input[type=email]', :count => 1, :name => 'email', :class => 'string'
    end

    it 'should display email field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=email]', :count => 1, :name => 'email'
      assert_response_has_tag 'form.advanced-form fieldset input[type=email]', :count => 1, :name => 'email', :class => 'string'
    end
  end

  describe 'for #url_field_tag method' do
    it 'should display url field in ruby' do
      actual_html = url_field_tag(:webpage, :class => 'string')
      assert_html_has_tag(actual_html, :input, :type => 'url', :class => 'string', :name => 'webpage')
    end

    it 'should display url field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=url]', :count => 1, :name => 'webpage'
      assert_response_has_tag 'form.advanced-form fieldset input[type=url]', :count => 1, :name => 'webpage', :class => 'string'
    end

    it 'should display url field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=url]', :count => 1, :name => 'webpage'
      assert_response_has_tag 'form.advanced-form fieldset input[type=url]', :count => 1, :name => 'webpage', :class => 'string'
    end

    it 'should display url field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=url]', :count => 1, :name => 'webpage'
      assert_response_has_tag 'form.advanced-form fieldset input[type=url]', :count => 1, :name => 'webpage', :class => 'string'
    end
  end

  describe 'for #text_area_tag method' do
    it 'should display text area in ruby' do
      actual_html = text_area_tag(:about, :class => 'long')
      assert_html_has_tag(actual_html, :textarea, :class => "long", :name => 'about')
    end

    it 'should display text area in ruby with specified content' do
      actual_html = text_area_tag(:about, :value => "a test", :rows => 5, :cols => 6)
      assert_html_has_tag(actual_html, :textarea, :content => "a test", :name => 'about', :rows => "5", :cols => "6")
    end

    it 'should insert newline to before of content' do
      actual_html = text_area_tag(:about, :value => "\na test&".html_safe)
      assert_html_has_tag(actual_html, :textarea, :content => "\na test&".html_safe, :name => 'about')
      assert_match(%r{<textarea[^>]*>\n\na test&</textarea>}, actual_html)
    end

    it 'should display text area in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.advanced-form textarea', :count => 1, :name => 'about', :class => 'large'
    end

    it 'should display text area in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.advanced-form textarea', :count => 1, :name => 'about', :class => 'large'
    end

    it 'should display text area in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.advanced-form textarea', :count => 1, :name => 'about', :class => 'large'
    end
  end

  describe 'for #password_field_tag method' do
    it 'should display password field in ruby' do
      actual_html = password_field_tag(:password, :class => 'long')
      assert_html_has_tag(actual_html, :input, :type => 'password', :class => "long", :name => 'password')
    end

    it 'should display password field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=password]', :count => 1, :name => 'password'
      assert_response_has_tag 'form.advanced-form input[type=password]', :count => 1, :name => 'password'
    end

    it 'should display password field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=password]', :count => 1, :name => 'password'
      assert_response_has_tag 'form.advanced-form input[type=password]', :count => 1, :name => 'password'
    end

    it 'should display password field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=password]', :count => 1, :name => 'password'
      assert_response_has_tag 'form.advanced-form input[type=password]', :count => 1, :name => 'password'
    end
  end

  describe 'for #file_field_tag method' do
    it 'should display file field in ruby' do
      actual_html = file_field_tag(:photo, :class => 'photo')
      assert_html_has_tag(actual_html, :input, :type => 'file', :class => "photo", :name => 'photo')
    end

    it 'should have an array name with multiple option' do
      actual_html = file_field_tag(:photos, :multiple => true)
      assert_html_has_tag(actual_html, :input, :name => 'photos[]')
    end

    it 'should display file field in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=file]', :count => 1, :name => 'photo', :class => 'upload'
    end

    it 'should display file field in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=file]', :count => 1, :name => 'photo', :class => 'upload'
    end

    it 'should display file field in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=file]', :count => 1, :name => 'photo', :class => 'upload'
    end
  end

  describe "for #check_box_tag method" do
    it 'should display check_box tag in ruby' do
      actual_html = check_box_tag("clear_session")
      assert_html_has_tag(actual_html, :input, :type => 'checkbox', :value => '1', :name => 'clear_session')
      assert_html_has_no_tag(actual_html, :input, :type => 'hidden')
    end

    it 'should display check_box tag in ruby with extended attributes' do
      actual_html = check_box_tag("clear_session", :disabled => true, :checked => true)
      assert_html_has_tag(actual_html, :input, :type => 'checkbox', :disabled => 'disabled', :checked => 'checked')
    end

    it 'should display check_box tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=checkbox]', :count => 1
      assert_response_has_tag 'form.advanced-form input[type=checkbox]', :value => "1", :checked => 'checked'
    end

    it 'should display check_box tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=checkbox]', :count => 1
      assert_response_has_tag 'form.advanced-form input[type=checkbox]', :value => "1", :checked => 'checked'
    end

    it 'should display check_box tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=checkbox]', :count => 1
      assert_response_has_tag 'form.advanced-form input[type=checkbox]', :value => "1", :checked => 'checked'
    end
  end

  describe "for #radio_button_tag method" do
    it 'should display radio_button tag in ruby' do
      actual_html = radio_button_tag("gender", :value => 'male')
      assert_html_has_tag(actual_html, :input, :type => 'radio', :value => 'male', :name => 'gender')
    end

    it 'should display radio_button tag in ruby with extended attributes' do
      actual_html = radio_button_tag("gender", :disabled => true, :checked => true)
      assert_html_has_tag(actual_html, :input, :type => 'radio', :disabled => 'disabled', :checked => 'checked')
    end

    it 'should display radio_button tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=radio]', :count => 1, :value => 'male'
      assert_response_has_tag 'form.simple-form input[type=radio]', :count => 1, :value => 'female'
      assert_response_has_tag 'form.advanced-form input[type=radio]', :value => "male", :checked => 'checked'
      assert_response_has_tag 'form.advanced-form input[type=radio]', :value => "female"
    end

    it 'should display radio_button tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=radio]', :count => 1, :value => 'male'
      assert_response_has_tag 'form.simple-form input[type=radio]', :count => 1, :value => 'female'
      assert_response_has_tag 'form.advanced-form input[type=radio]', :value => "male", :checked => 'checked'
      assert_response_has_tag 'form.advanced-form input[type=radio]', :value => "female"
    end

    it 'should display radio_button tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=radio]', :count => 1, :value => 'male'
      assert_response_has_tag 'form.simple-form input[type=radio]', :count => 1, :value => 'female'
      assert_response_has_tag 'form.advanced-form input[type=radio]', :value => "male", :checked => 'checked'
      assert_response_has_tag 'form.advanced-form input[type=radio]', :value => "female"
    end
  end

  describe "for #select_tag method" do
    it 'should display select tag in ruby' do
      actual_html = select_tag(:favorite_color, :options => ['green', 'blue', 'black'], :include_blank => true)
      assert_html_has_tag(actual_html, :select, :name => 'favorite_color')
      assert_html_has_tag(actual_html, 'select option:first-child', :content => '')
      assert_html_has_tag(actual_html, 'select option', :content => 'green', :value => 'green')
      assert_html_has_tag(actual_html, 'select option', :content => 'blue',  :value => 'blue')
      assert_html_has_tag(actual_html, 'select option', :content => 'black', :value => 'black')
    end

    it 'should display select tag in ruby with extended attributes' do
      actual_html = select_tag(:favorite_color, :disabled => true, :options => ['only', 'option'])
      assert_html_has_tag(actual_html, :select, :disabled => 'disabled')
    end

    it 'should take a range as a collection for options' do
      actual_html = select_tag(:favorite_color, :options => (1..3))
      assert_html_has_tag(actual_html, :select)
      assert_html_has_tag(actual_html, 'select option', :content => '1', :value => '1')
      assert_html_has_tag(actual_html, 'select option', :content => '2', :value => '2')
      assert_html_has_tag(actual_html, 'select option', :content => '3', :value => '3')
    end

    it 'should include blank for grouped options' do
      opts = { "Red"  => ["Rose","Fire"], "Blue" => ["Sky","Sea"] }
      actual_html = select_tag( 'color', :grouped_options => opts, :include_blank => true )
      assert_html_has_tag(actual_html, 'select option:first-child', :value => "", :content => "")
    end

    it 'should include blank as caption' do
      opts = { "Red"  => ["Rose","Fire"], "Blue" => ["Sky","Sea"] }
      actual_html = select_tag( 'color', :grouped_options => opts, :include_blank => 'Choose your destiny' )
      assert_html_has_tag(actual_html, 'select option:first-child', :value => "", :content => "Choose your destiny")
      assert_html_has_no_tag(actual_html, 'select[include_blank]')
    end

    it 'should display select tag with grouped options for a nested array' do
      opts = [
        ["Friends",["Yoda",["Obiwan",2]]],
        ["Enemies", ["Palpatine",['Darth Vader',3]]]
      ]
      actual_html = select_tag( 'name', :grouped_options => opts )
      assert_html_has_tag(actual_html, :select,   :name => "name")
      assert_html_has_tag(actual_html, :optgroup, :label => "Friends")
      assert_html_has_tag(actual_html, :option,   :value => "Yoda", :content => "Yoda")
      assert_html_has_tag(actual_html, :option,   :value => "2",  :content => "Obiwan")
      assert_html_has_tag(actual_html, :optgroup, :label => "Enemies")
      assert_html_has_tag(actual_html, :option,   :value => "Palpatine", :content => "Palpatine")
      assert_html_has_tag(actual_html, :option,   :value => "3", :content => "Darth Vader")
    end

    it 'should display select tag with grouped options for a nested array and accept disabled groups' do
      opts = [
        ["Friends",["Yoda",["Obiwan",2]]],
        ["Enemies", ["Palpatine",['Darth Vader',3]], {:disabled => true}]
      ]
      actual_html = select_tag( 'name', :grouped_options => opts )
      assert_html_has_tag(actual_html, :select,   :name => "name")
      assert_html_has_tag(actual_html, :option,   :disabled => 'disabled', :count => 0)
      assert_html_has_tag(actual_html, :optgroup, :disabled => 'disabled', :count => 1)
      assert_html_has_tag(actual_html, :optgroup, :label => "Enemies", :disabled => 'disabled')
    end

    it 'should display select tag with grouped options for a nested array and accept disabled groups and/or with disabled options' do
      opts = [
        ["Friends",["Yoda",["Obiwan",2, {:disabled => true}]]],
        ["Enemies", [["Palpatine", "Palpatine", {:disabled => true}],['Darth Vader',3]], {:disabled => true}]
      ]
      actual_html = select_tag( 'name', :grouped_options => opts )
      assert_html_has_tag(actual_html, :select,   :name => "name")
      assert_html_has_tag(actual_html, :option,   :disabled => 'disabled', :count => 2)
      assert_html_has_tag(actual_html, :optgroup, :disabled => 'disabled', :count => 1)
      assert_html_has_tag(actual_html, :option,   :content => "Obiwan", :disabled => 'disabled')
      assert_html_has_tag(actual_html, :optgroup, :label => "Enemies", :disabled => 'disabled')
      assert_html_has_tag(actual_html, :option,   :value => "Palpatine", :content => "Palpatine", :disabled => 'disabled')
    end

    it 'should display select tag with grouped options for a hash' do
      opts = {
        "Friends" => ["Yoda",["Obiwan",2]],
        "Enemies" => ["Palpatine",['Darth Vader',3]]
      }
      actual_html = select_tag( 'name', :grouped_options => opts )
      assert_html_has_tag(actual_html, :select,   :name  => "name")
      assert_html_has_tag(actual_html, :optgroup, :label => "Friends")
      assert_html_has_tag(actual_html, :option,   :value => "Yoda", :content => "Yoda")
      assert_html_has_tag(actual_html, :option,   :value => "2",    :content => "Obiwan")
      assert_html_has_tag(actual_html, :optgroup, :label => "Enemies")
      assert_html_has_tag(actual_html, :option,   :value => "Palpatine", :content => "Palpatine")
      assert_html_has_tag(actual_html, :option,   :value => "3", :content => "Darth Vader")
    end

    it 'should display select tag with grouped options for a hash and accept disabled groups and/or with disabled options' do
      opts = {
        "Friends" => ["Yoda",["Obiwan",2,{:disabled => true}]],
        "Enemies" => [["Palpatine","Palpatine",{:disabled => true}],["Darth Vader",3], {:disabled => true}]
      }
      actual_html = select_tag( 'name', :grouped_options => opts )
      assert_html_has_tag(actual_html, :select,   :name => "name")
      assert_html_has_tag(actual_html, :option,   :disabled => 'disabled', :count => 2)
      assert_html_has_tag(actual_html, :optgroup, :disabled => 'disabled', :count => 1)
      assert_html_has_tag(actual_html, :option,   :content => "Obiwan", :disabled => 'disabled')
      assert_html_has_tag(actual_html, :optgroup, :label => "Enemies", :disabled => 'disabled')
      assert_html_has_tag(actual_html, :option,   :value => "Palpatine", :content => "Palpatine", :disabled => 'disabled')
    end

    it 'should display select tag with grouped options for a rails-style attribute hash' do
      opts = {
        "Friends" => ["Yoda",["Obiwan",2,{:magister=>'no'}],{:lame=>'yes'}],
        "Enemies" => [["Palpatine","Palpatine",{:scary=>'yes',:old=>'yes'}],["Darth Vader",3,{:disabled=>true}]]
      }
      actual_html = select_tag( 'name', :grouped_options => opts, :disabled_options => [2], :selected => ['Yoda'] )
      assert_html_has_tag(actual_html, :optgroup, :label => "Friends", :lame => 'yes')
      assert_html_has_tag(actual_html, :option,   :value => "Palpatine", :content => "Palpatine", :scary => 'yes', :old => 'yes')
      assert_html_has_tag(actual_html, :option,   :content => "Darth Vader", :disabled => 'disabled')
      assert_html_has_tag(actual_html, :option,   :content => "Obiwan", :disabled => 'disabled')
      assert_html_has_tag(actual_html, :option,   :content => "Yoda", :selected => 'selected')
    end

    it 'should display select tag in ruby with multiple attribute' do
      actual_html = select_tag(:favorite_color, :multiple => true, :options => ['only', 'option'])
      assert_html_has_tag(actual_html, :select, :multiple => 'multiple', :name => 'favorite_color[]')
    end

    it 'should display options with values and single selected' do
      options = [['Green', 'green1'], ['Blue', 'blue1'], ['Black', "black1"]]
      actual_html = select_tag(:favorite_color, :options => options, :selected => 'green1')
      assert_html_has_tag(actual_html, :select, :name => 'favorite_color')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :content => 'Green', :value => 'green1', :selected => 'selected')
      assert_html_has_tag(actual_html, 'select option', :content => 'Blue', :value => 'blue1')
      assert_html_has_tag(actual_html, 'select option', :content => 'Black', :value => 'black1')
    end

    it 'should display selected options first based on values not content' do
      options = [['First', 'one'], ['one', 'two'], ['three', 'three']]
      actual_html = select_tag(:number, :options => options, :selected => 'one')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :content => 'First', :value => 'one', :selected => 'selected')
    end

    it 'should display selected options falling back to checking content' do
      options = [['one', nil, :value => nil], ['two', nil, :value => nil], ['three', 'three']]
      actual_html = select_tag(:number, :options => options, :selected => 'one')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :content => 'one', :selected => 'selected')
    end

    it 'should display options with values and accept disabled options' do
      options = [['Green', 'green1', {:disabled => true}], ['Blue', 'blue1'], ['Black', "black1"]]
      actual_html = select_tag(:favorite_color, :options => options)
      assert_html_has_tag(actual_html, :select, :name => 'favorite_color')
      assert_html_has_tag(actual_html, 'select option', :disabled => 'disabled', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :content => 'Green', :value => 'green1', :disabled => 'disabled')
      assert_html_has_tag(actual_html, 'select option', :content => 'Blue', :value => 'blue1')
      assert_html_has_tag(actual_html, 'select option', :content => 'Black', :value => 'black1')
    end

    it 'should display option with values and multiple selected' do
      options = [['Green', 'green1'], ['Blue', 'blue1'], ['Black', "black1"]]
      actual_html = select_tag(:favorite_color, :options => options, :selected => ['green1', 'black1'])
      assert_html_has_tag(actual_html, :select, :name => 'favorite_color')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 2)
      assert_html_has_tag(actual_html, 'select option', :content => 'Green', :value => 'green1', :selected => 'selected')
      assert_html_has_tag(actual_html, 'select option', :content => 'Blue', :value => 'blue1')
      assert_html_has_tag(actual_html, 'select option', :content => 'Black', :value => 'black1', :selected => 'selected')
    end

    it 'should not misselect options with default value' do
      options = ['Green', 'Blue']
      actual_html = select_tag(:favorite_color, :options => options, :selected => ['Green', ''])
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :content => 'Green', :value => 'Green', :selected => 'selected')
    end

    it 'should display options selected only for exact match' do
      options = [['One', '1'], ['1', '10'], ['Two', "-1"]]
      actual_html = select_tag(:range, :options => options, :selected => '-1')
      assert_html_has_tag(actual_html, :select, :name => 'range')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :content => 'Two', :value => '-1', :selected => 'selected')
    end

    it 'should display select tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form select', :count => 1, :name => 'color'
      assert_response_has_tag('select option', :content => 'green',  :value => 'green')
      assert_response_has_tag('select option', :content => 'orange', :value => 'orange')
      assert_response_has_tag('select option', :content => 'purple', :value => 'purple')
      assert_response_has_tag('form.advanced-form select', :name => 'fav_color')
      assert_response_has_tag('select option', :content => 'green',  :value => '1')
      assert_response_has_tag('select option', :content => 'orange', :value => '2', :selected => 'selected')
      assert_response_has_tag('select option', :content => 'purple', :value => '3')
      assert_response_has_tag('select optgroup', :label => 'foo')
      assert_response_has_tag('select optgroup', :label => 'bar')
      assert_response_has_tag('select optgroup option', :content => 'foo', :value => 'foo')
      assert_response_has_tag('select optgroup option', :content => 'bar', :value => 'bar')
      assert_response_has_tag('select optgroup', :label => 'Friends')
      assert_response_has_tag('select optgroup', :label => 'Enemies')
      assert_response_has_tag('select optgroup option', :content => 'Yoda', :value => 'Yoda')
      assert_response_has_tag('select optgroup option', :content => 'Obiwan', :value => '1')
      assert_response_has_tag('select optgroup option', :content => 'Palpatine', :value => 'Palpatine')
      assert_response_has_tag('select optgroup option', :content => 'Darth Vader', :value => '3')
    end

    it 'should display select tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form select', :count => 1, :name => 'color'
      assert_response_has_tag('select option', :content => 'green',  :value => 'green')
      assert_response_has_tag('select option', :content => 'orange', :value => 'orange')
      assert_response_has_tag('select option', :content => 'purple', :value => 'purple')
      assert_response_has_tag('form.advanced-form select', :name => 'fav_color')
      assert_response_has_tag('select option', :content => 'green',  :value => '1')
      assert_response_has_tag('select option', :content => 'orange', :value => '2', :selected => 'selected')
      assert_response_has_tag('select option', :content => 'purple', :value => '3')
      assert_response_has_tag('select optgroup', :label => 'foo')
      assert_response_has_tag('select optgroup', :label => 'bar')
      assert_response_has_tag('select optgroup option', :content => 'foo', :value => 'foo')
      assert_response_has_tag('select optgroup option', :content => 'bar', :value => 'bar')
      assert_response_has_tag('select optgroup', :label => 'Friends')
      assert_response_has_tag('select optgroup', :label => 'Enemies')
      assert_response_has_tag('select optgroup option', :content => 'Yoda', :value => 'Yoda')
      assert_response_has_tag('select optgroup option', :content => 'Obiwan', :value => '1')
      assert_response_has_tag('select optgroup option', :content => 'Palpatine', :value => 'Palpatine')
      assert_response_has_tag('select optgroup option', :content => 'Darth Vader', :value => '3')
    end

    it 'should display select tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form select', :count => 1, :name => 'color'
      assert_response_has_tag('select option', :content => 'green',  :value => 'green')
      assert_response_has_tag('select option', :content => 'orange', :value => 'orange')
      assert_response_has_tag('select option', :content => 'purple', :value => 'purple')
      assert_response_has_tag('form.advanced-form select', :name => 'fav_color')
      assert_response_has_tag('select option', :content => 'green',  :value => '1')
      assert_response_has_tag('select option', :content => 'orange', :value => '2', :selected => 'selected')
      assert_response_has_tag('select option', :content => 'purple', :value => '3')
      assert_response_has_tag('select optgroup', :label => 'foo')
      assert_response_has_tag('select optgroup', :label => 'bar')
      assert_response_has_tag('select optgroup option', :content => 'foo', :value => 'foo')
      assert_response_has_tag('select optgroup option', :content => 'bar', :value => 'bar')
      assert_response_has_tag('select optgroup', :label => 'Friends')
      assert_response_has_tag('select optgroup', :label => 'Enemies')
      assert_response_has_tag('select optgroup option', :content => 'Yoda', :value => 'Yoda')
      assert_response_has_tag('select optgroup option', :content => 'Obiwan', :value => '1')
      assert_response_has_tag('select optgroup option', :content => 'Palpatine', :value => 'Palpatine')
      assert_response_has_tag('select optgroup option', :content => 'Darth Vader', :value => '3')
    end
  end

  describe 'for #submit_tag method' do
    it 'should display submit tag in ruby' do
      actual_html = submit_tag("Update", :class => 'success')
      assert_html_has_tag(actual_html, :input, :type => 'submit', :class => "success", :value => 'Update')
    end

    it 'should display submit tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.simple-form input[type=submit]', :count => 1, :value => "Submit"
      assert_response_has_tag 'form.advanced-form input[type=submit]', :count => 1, :value => "Login"
    end

    it 'should display submit tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.simple-form input[type=submit]', :count => 1, :value => "Submit"
      assert_response_has_tag 'form.advanced-form input[type=submit]', :count => 1, :value => "Login"
    end

    it 'should display submit tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.simple-form input[type=submit]', :count => 1, :value => "Submit"
      assert_response_has_tag 'form.advanced-form input[type=submit]', :count => 1, :value => "Login"
    end

    describe 'for omitted args' do
      it 'should display submit tag with default caption' do
        actual_html = submit_tag()
        assert_html_has_tag(actual_html, :input, :type => 'submit', :value => 'Submit')
      end
    end

    describe 'for omitted caption arg' do
      it 'should display submit tag with default caption' do
        actual_html = submit_tag(:class => 'success')
        assert_html_has_tag(actual_html, :input, :type => 'submit', :class => 'success', :value => 'Submit')
      end

      it 'should display submit tag without caption value when nil' do
        actual_html = submit_tag(nil, :class => 'success')
        assert_html_has_tag(actual_html, :input, :type => 'submit', :class => 'success')
        assert_html_has_no_tag(actual_html, :input, :type => 'submit', :class => 'success', :value => 'Submit')
      end
    end
  end

  describe 'for #button_tag method' do
    it 'should display submit tag in ruby' do
      actual_html = button_tag("Cancel", :class => 'clear')
      assert_html_has_tag(actual_html, :input, :type => 'button', :class => "clear", :value => 'Cancel')
    end

    it 'should display submit tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=button]', :count => 1, :value => "Cancel"
    end

    it 'should display submit tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=button]', :count => 1, :value => "Cancel"
    end

    it 'should display submit tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=button]', :count => 1, :value => "Cancel"
    end
  end

  describe 'for #image_submit_tag method' do
    before do
      @stamp = stop_time_for_test.to_i
    end

    it 'should display image submit tag in ruby with relative path' do
      actual_html = image_submit_tag('buttons/ok.png', :class => 'success')
      assert_html_has_tag(actual_html, :input, :type => 'image', :class => "success", :src => "/images/buttons/ok.png?#{@stamp}")
    end

    it 'should display image submit tag in ruby with absolute path' do
      actual_html = image_submit_tag('/system/ok.png', :class => 'success')
      assert_html_has_tag(actual_html, :input, :type => 'image', :class => "success", :src => "/system/ok.png")
    end

    it 'should display image submit tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=image]', :count => 1, :src => "/images/buttons/submit.png?#{@stamp}"
    end

    it 'should display image submit tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=image]', :count => 1, :src => "/images/buttons/submit.png?#{@stamp}"
    end

    it 'should display image submit tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'form.advanced-form input[type=image]', :count => 1, :src => "/images/buttons/submit.png?#{@stamp}"
    end
  end

  describe 'for #button_to method' do
    it 'should have a form and set the method properly' do
      actual_html = button_to('Delete', '/users/1', :method => :delete)
      assert_html_has_tag(actual_html, 'form', :action => '/users/1')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'delete')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "authenticity_token")
    end

    it 'should add a submit button by default if no content is specified' do
      actual_html = button_to('My Delete Button', '/users/1', :method => :delete)
      assert_html_has_tag(actual_html, 'form input', :type => 'submit', :value => 'My Delete Button')
    end

    it 'should set specific content inside the form if a block was sent' do
      actual_html = button_to('My Delete Button', '/users/1', :method => :delete) do
        content_tag :button, "My button's content", :type => :submit, :title => "My button"
      end
      assert_html_has_tag(actual_html, 'form button', :type => 'submit', :content => "My button's content", :title => "My button")
    end

    it 'should pass options on submit button when submit_options are given' do
      actual_html = button_to("Fancy button", '/users/1', :submit_options => { :class => :fancy })
      assert_html_has_tag(actual_html, 'form input', :type => 'submit', :value => 'Fancy button', :class => 'fancy')
      assert_html_has_no_tag(actual_html, 'form', :"submit_options-class" => 'fancy')
    end

    it 'should display correct button_to in erb' do
      get "/erb/button_to"
      assert_response_has_tag('form', :action => '/foo')
      assert_response_has_tag('form button label', :for => 'username', :content => 'Username: ')
      assert_response_has_tag('form', :action => '/bar')
      assert_response_has_tag('#test-point ~ form > input[type=submit]', :value => 'Bar button')
    end

    it 'should display correct button_to in haml' do
      get "/haml/button_to"
      assert_response_has_tag('form', :action => '/foo')
      assert_response_has_tag('form button label', :for => 'username', :content => 'Username: ')
      assert_response_has_tag('form', :action => '/bar')
      assert_response_has_tag('#test-point ~ form > input[type=submit]', :value => 'Bar button')
    end

    it 'should display correct button_to in slim' do
      get "/slim/button_to"
      assert_response_has_tag('form', :action => '/foo')
      assert_response_has_tag('form button label', :for => 'username', :content => 'Username: ')
      assert_response_has_tag('form', :action => '/bar')
      assert_response_has_tag('#test-point ~ form > input[type=submit]', :value => 'Bar button')
    end
  end

  describe 'for #range_field_tag' do
    it 'should create an input tag with min and max options' do
      actual_html = range_field_tag('ranger', :min => 20, :max => 50)
      assert_html_has_tag(actual_html, 'input', :type => 'range', :name => 'ranger', :min => '20', :max => '50')
    end

    it 'should create an input tag with range' do
      actual_html = range_field_tag('ranger', :range => 1..20)
      assert_html_has_tag(actual_html, 'input', :min => '1', :max => '20')
    end

    it 'should display correct range_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', :type => 'range', :name => 'ranger_with_min_max', :min => '1', :max => '50', :count => 1
      assert_response_has_tag 'input', :type => 'range', :name => 'ranger_with_range', :min => '1', :max => '5', :count => 1
    end

    it 'should display correct range_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', :type => 'range', :name => 'ranger_with_min_max', :min => '1', :max => '50', :count => 1
      assert_response_has_tag 'input', :type => 'range', :name => 'ranger_with_range', :min => '1', :max => '5', :count => 1
    end

    it 'should display correct range_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', :type => 'range', :name => 'ranger_with_min_max', :min => '1', :max => '50', :count => 1
      assert_response_has_tag 'input', :type => 'range', :name => 'ranger_with_range', :min => '1', :max => '5', :count => 1
    end
  end

  describe 'for #datetime_field_tag' do
    before do
      @expected = {
        :name => 'datetime',
        :max => "2000-04-01T12:00:00.000+0000",
        :min => "1993-02-24T12:30:45.000+0000",
        :value => "2000-04-01T12:00:00.000+0000"
      }
    end

    it 'should create an input tag with min and max and value options' do
      max = DateTime.new(2000, 4, 1, 12, 0, 0)
      min = DateTime.new(1993, 2, 24, 12, 30, 45)
      value = DateTime.new(2000, 4, 1, 12, 0, 0)
      actual_html = datetime_field_tag('datetime', :max => max, :min => min, :value => value)
      assert_html_has_tag(actual_html, 'input', @expected)
    end

    it 'should create an input tag with datetime' do
      actual_html = datetime_field_tag('datetime')
      assert_html_has_tag(actual_html, 'input[type=datetime]')
    end

    it 'should create an input tag when the format string passed as datetime option value' do
      actual_html = datetime_field_tag('datetime', :value => '1993-02-24T12:30:45+00:00')
      assert_html_has_tag(actual_html, 'input[type=datetime]', :value => "1993-02-24T12:30:45.000+0000")
    end

    it 'should display correct datetime_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct datetime_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct datetime_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end

  describe 'for #datetime_local_field_tag' do
    before do
      @expected = {
        :name => 'datetime_local',
        :max => "2000-04-01T12:00:00",
        :min => "1993-02-24T12:30:45",
        :value => "2000-04-01T12:00:00"
      }
    end

    it 'should create an input tag with min and max and value options' do
      max = DateTime.new(2000, 4, 1, 12, 0, 0)
      min = DateTime.new(1993, 2, 24, 12, 30, 45)
      value = DateTime.new(2000, 4, 1, 12, 0, 0)
      actual_html = datetime_local_field_tag('datetime_local', :max => max, :min => min, :value => value)
      assert_html_has_tag(actual_html, 'input', @expected)
    end

    it 'should create an input tag with datetime-local' do
      actual_html = datetime_local_field_tag('datetime_local')
      assert_html_has_tag(actual_html, 'input[type="datetime-local"]')
    end

    it 'should create an input tag when the format string passed as datetime-local option value' do
      actual_html = datetime_local_field_tag('datetime_local', :value => '1993-02-24T12:30:45')
      assert_html_has_tag(actual_html, 'input[type="datetime-local"]', :value => "1993-02-24T12:30:45")
    end

    it 'should display correct datetime_local_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct datetime_local_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct datetime_local_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end

  describe 'for #date_field_tag' do
    before do
      @expected = {
        :name => 'date',
        :max => "2000-04-01",
        :min => "1993-02-24",
        :value => "2000-04-01"
      }
    end

    it 'should create an input tag with min and max and value options' do
      max = DateTime.new(2000, 4, 1)
      min = DateTime.new(1993, 2, 24)
      value = DateTime.new(2000, 4, 1)
      actual_html = date_field_tag('date', :max => max, :min => min, :value => value)
      assert_html_has_tag(actual_html, 'input', @expected)
    end

    it 'should create an input tag with date' do
      actual_html = date_field_tag('date')
      assert_html_has_tag(actual_html, 'input[type="date"]')
    end

    it 'should create an input tag when the format string passed as date option value' do
      actual_html = date_field_tag('date', :value => '1993-02-24')
      assert_html_has_tag(actual_html, 'input[type="date"]', :value => "1993-02-24")
    end

    it 'should display correct date_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct date_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct date_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end

  describe 'for #month_field_tag' do
    before do
      @expected = {
        :name => 'month',
        :max => "2000-04",
        :min => "1993-02",
        :value => "2000-04"
      }
    end

    it 'should create an input tag with min and max and value options' do
      max = DateTime.new(2000, 4, 1)
      min = DateTime.new(1993, 2, 24)
      value = DateTime.new(2000, 4, 1)
      actual_html = month_field_tag('month', :max => max, :min => min, :value => value)
      assert_html_has_tag(actual_html, 'input', @expected)
    end

    it 'should create an input tag with month' do
      actual_html = month_field_tag('month')
      assert_html_has_tag(actual_html, 'input[type="month"]')
    end

    it 'should create an input tag when the format string passed as month option value' do
      actual_html = month_field_tag('month', :value => '1993-02-24')
      assert_html_has_tag(actual_html, 'input[type="month"]', :value => "1993-02")
    end

    it 'should display correct month_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct month_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct month_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end

  describe 'for #week_field_tag' do
    before do
      @expected = {
        :name => 'week',
        :max => "2000-W13",
        :min => "1993-W08",
        :value => "2000-W13"
      }
    end

    it 'should create an input tag with min and max and value options' do
      max = DateTime.new(2000, 4, 1)
      min = DateTime.new(1993, 2, 24)
      value = DateTime.new(2000, 4, 1)
      actual_html = week_field_tag('week', :max => max, :min => min, :value => value)
      assert_html_has_tag(actual_html, 'input', @expected)
    end

    it 'should create an input tag with week' do
      actual_html = week_field_tag('week')
      assert_html_has_tag(actual_html, 'input[type="week"]')
    end

    it 'should create an input tag when the format string passed as week option value' do
      actual_html = week_field_tag('week', :value => '1993-02-24')
      assert_html_has_tag(actual_html, 'input[type="week"]', :value => "1993-W08")
    end

    it 'should display correct week_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct week_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct week_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end

  describe 'for #time_field_tag' do
    before do
      @expected = {
        :name => 'time',
        :max => "13:30:00.000",
        :min => "01:19:12.000",
        :value => "13:30:00.000"
      }
    end

    it 'should create an input tag with min and max and value options' do
      max = Time.new(2008, 6, 21, 13, 30, 0)
      min = Time.new(1993, 2, 24, 1, 19, 12)
      value = Time.new(2008, 6, 21, 13, 30, 0)
      actual_html = time_field_tag('time', :max => max, :min => min, :value => value)
      assert_html_has_tag(actual_html, 'input', @expected)
    end

    it 'should create an input tag with time' do
      actual_html = time_field_tag('time')
      assert_html_has_tag(actual_html, 'input[type="time"]')
    end

    it 'should create an input tag when the format string passed as time option value' do
      actual_html = time_field_tag('time', :value => '1993-02-24 01:19:12')
      assert_html_has_tag(actual_html, 'input[type="time"]', :value => "01:19:12.000")
    end

    it 'should display correct time_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct time_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct time_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end

  describe 'for #color_field_tag' do
    before do
      @expected = {
        :name => 'color',
        :value => '#ff0000'
      }
    end

    it 'should create an input tag with value option' do
      actual_html = color_field_tag('color', :value => "#ff0000")
      assert_html_has_tag(actual_html, 'input[type="color"]', @expected)
    end

    it 'should create an input tag with short color code' do
      actual_html = color_field_tag('color', :value => "#f00")
      assert_html_has_tag(actual_html, 'input[type="color"]', @expected)
    end

    it 'should display correct color_field_tag in erb' do
      get "/erb/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct color_field_tag in haml' do
      get "/haml/form_tag"
      assert_response_has_tag 'input', @expected
    end

    it 'should display correct color_field_tag in slim' do
      get "/slim/form_tag"
      assert_response_has_tag 'input', @expected
    end
  end
end
