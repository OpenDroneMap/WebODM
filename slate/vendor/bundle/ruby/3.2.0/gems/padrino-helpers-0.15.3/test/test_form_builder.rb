require File.expand_path(File.dirname(__FILE__) + '/helper')
require File.expand_path(File.dirname(__FILE__) + '/fixtures/markup_app/app')

describe "FormBuilder" do
  include Padrino::Helpers::FormHelpers

  def app
    MarkupDemo
  end

  # Dummy form builder for testing
  module Padrino::Helpers::FormBuilder
    class FakeFormBuilder < AbstractFormBuilder
      def foo_field; @template.content_tag(:span, "bar"); end
    end
  end

  def setup
    role_types = [mock_model('Role', :name => "Admin", :id => 1),
      mock_model('Role', :name => 'Moderate', :id => 2),  mock_model('Role', :name => 'Limited', :id => 3)]
    @user = mock_model("User", :first_name => "Joe", :email => '', :session_id => 54)
    @user.stubs(:errors => {:a => "must be present", :b => "must be valid", :email => "Must be valid", :first_name => []})
    @user.stubs(:role_types => role_types, :role => "1", :roles => [1,3])
    @user_none = mock_model("User")
  end

  def standard_builder(object=@user)
    Padrino::Helpers::FormBuilder::StandardFormBuilder.new(self, object)
  end

  describe 'for #form_for method' do
    it 'should display correct form html' do
      actual_html = form_for(@user, '/register', :id => 'register', :"accept-charset" => "UTF-8", :method => 'post') { "Demo" }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :id => 'register', :method => 'post', :content => "Demo")
      assert_html_has_tag(actual_html, 'form input[type=hidden]', :name => '_method', :count => 0) # no method action field
    end

    it 'should display correct form html with fake object' do
      actual_html = form_for(:markup_user, '/register', :id => 'register', :"accept-charset" => "UTF-8", :method => 'post') { |f| f.text_field :username }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :id => 'register', :method => 'post')
      assert_html_has_tag(actual_html, 'form input', :type => 'text', :name => 'markup_user[username]')
      assert_html_has_tag(actual_html, 'form input[type=hidden]', :name => '_method', :count => 0) # no method action field
    end

    it 'should display correct form html for namespaced object' do
      actual_html = form_for(Outer::UserAccount.new, '/register', :"accept-charset" => "UTF-8", :method => 'post') { |f| f.text_field :username }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :method => 'post')
      assert_html_has_tag(actual_html, 'form input', :type => 'text', :name => 'outer_user_account[username]')
    end

    it 'should display form specifying default builder setting' do
      self.expects(:settings).returns(stub(:default_builder => 'FakeFormBuilder', :protect_from_csrf => false)).at_least_once
      actual_html = form_for(@user, '/register', :id => 'register', :"accept-charset" => "UTF-8", :method => 'post') { |f| f.foo_field }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :method => 'post')
      assert_html_has_tag(actual_html, 'span', :content => "bar")
    end

    it 'should display correct form html with remote option' do
      actual_html = form_for(@user, '/update', :"accept-charset" => "UTF-8", :remote => true) { "Demo" }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/update', :method => 'post', "data-remote" => 'true')
    end

    it 'should display correct form html with namespace option' do
      actual_html = form_for(@user, '/update', :namespace => 'foo') do |f|
        f.text_field(:first_name) << f.fields_for(:role_types) { |role| role.text_field(:name) }
      end

      assert_html_has_no_tag(actual_html, :form, :namespace => 'foo')
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'user[first_name]', :id => 'foo_user_first_name')
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'user[role_types_attributes][0][name]', :id => 'foo_user_role_types_attributes_0_name')
    end

    it 'should display correct form html with :as option' do
      actual_html = form_for(@user, '/update', :as => :customer) do |f|
        f.text_field(:first_name) << f.fields_for(:role_types) { |role| role.text_field(:name) }
      end

      assert_html_has_no_tag(actual_html, :form, :as => 'customer')
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'customer[first_name]', :id => 'customer_first_name')
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'customer[role_types_attributes][0][name]', :id => 'customer_role_types_attributes_0_name')
    end

    it 'should display correct form html with remote option and method put' do
      actual_html = form_for(@user, '/update', :"accept-charset" => "UTF-8", :remote => true, :method => 'put') { "Demo" }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :method => 'post', "data-remote" => 'true')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'put')
    end

    it 'should display correct form html with method :put' do
      actual_html = form_for(@user, '/update', :"accept-charset" => "UTF-8", :method => 'put') { "Demo" }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/update', :method => 'post')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'put')
    end

    it 'should display correct form html with method :delete' do
      actual_html = form_for(@user, '/destroy', :"accept-charset" => "UTF-8", :method => 'delete') { "Demo" }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/destroy', :method => 'post')
      assert_html_has_tag(actual_html, 'form input', :type => 'hidden', :name => "_method", :value => 'delete')
    end

    it 'should display correct form html with multipart' do
      actual_html = form_for(@user, '/register', :"accept-charset" => "UTF-8", :multipart => true) { "Demo" }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :enctype => "multipart/form-data")
    end

    it 'should support changing form builder type' do
      form_html = proc { form_for(@user, '/register', :"accept-charset" => "UTF-8", :builder => "AbstractFormBuilder") { |f| f.text_field_block(:name) } }
      assert_raises(NoMethodError) { form_html.call }
    end

    it 'should support using default standard builder' do
      actual_html = form_for(@user, '/register') { |f| f.text_field_block(:name) }
      assert_html_has_tag(actual_html, 'form p input[type=text]')
    end

    it 'should display fail for form with nil object' do
      assert_raises(RuntimeError) { form_for(@not_real, '/register', :id => 'register', :method => 'post') { "Demo" } }
    end

    it 'should display correct form in haml' do
      get "/haml/form_for"
      assert_response_has_tag :form, :action => '/demo', :id => 'demo'
      assert_response_has_tag :form, :action => '/another_demo', :id => 'demo2', :method => 'get'
      assert_response_has_tag :form, :action => '/third_demo', :id => 'demo3', :method => 'get'
      assert_response_has_tag :input, :name => 'authenticity_token'
    end

    it 'should display correct form in erb' do
      get "/erb/form_for"
      assert_response_has_tag :form, :action => '/demo', :id => 'demo'
      assert_response_has_tag :form, :action => '/another_demo', :id => 'demo2', :method => 'get'
      assert_response_has_tag :form, :action => '/third_demo', :id => 'demo3', :method => 'get'
      assert_response_has_tag :input, :name => 'authenticity_token'
    end

    it 'should display correct form in slim' do
      get "/slim/form_for"
      assert_response_has_tag :form, :action => '/demo', :id => 'demo'
      assert_response_has_tag :form, :action => '/another_demo', :id => 'demo2', :method => 'get'
      assert_response_has_tag :form, :action => '/third_demo', :id => 'demo3', :method => 'get'
      assert_response_has_tag :input, :name => 'authenticity_token'
    end

    it 'should have a class of "invalid" for fields with errors' do
      actual_html = form_for(@user, '/register') {|f| f.text_field(:email) }
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'user[email]', :id => 'user_email', :class => 'invalid')
    end

    it 'should not have a class of "invalid" for fields with no errors' do
      actual_html = form_for(@user, '/register') {|f| f.text_field(:first_name) }
      assert_html_has_no_tag(actual_html, :input, :type => 'text', :name => 'user[first_name]', :id => 'user_first_name', :class => 'invalid')
    end
  end

  describe 'for #fields_for method' do
    it 'should display correct fields html' do
      actual_html = fields_for(@user) { |f| f.text_field(:first_name) }
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'user[first_name]', :id => 'user_first_name')
    end

    it 'should display correct fields html with symbol object' do
      actual_html = fields_for(:markup_user) { |f| f.text_field(:first_name) }
      assert_html_has_tag(actual_html, :input, :type => 'text', :name => 'markup_user[first_name]', :id => 'markup_user_first_name')
    end

    it 'should display fail for nil object' do
      assert_raises(RuntimeError) { fields_for(@not_real) { |f| "Demo" } }
    end

    it 'should respect the builder of parent' do
      assert_raises(NoMethodError) do
        form_for(@user, '/register', builder: "AbstractFormBuilder") do |f|
          f.fields_for(:role_types, @user.role_types) do |field|
            field.submit_block "Submit"
          end
        end
      end
    end

    it 'should display correct simple fields in haml' do
      get "/haml/fields_for"
      assert_response_has_tag :form, :action => '/demo1', :id => 'demo-fields-for'
      assert_response_has_tag '#demo-fields-for input', :type => 'text', :name => 'markup_user[gender]', :value => 'male'
      assert_response_has_tag '#demo-fields-for input', :type => 'checkbox', :name => 'permission[can_edit]', :value => '1', :checked => 'checked'
      assert_response_has_tag '#demo-fields-for input', :type => 'checkbox', :name => 'permission[can_delete]'
    end

    it 'should display correct simple fields in erb' do
      get "/erb/fields_for"
      assert_response_has_tag :form, :action => '/demo1', :id => 'demo-fields-for'
      assert_response_has_tag '#demo-fields-for input', :type => 'text', :name => 'markup_user[gender]', :value => 'male'
      assert_response_has_tag '#demo-fields-for input', :type => 'checkbox', :name => 'permission[can_edit]', :value => '1', :checked => 'checked'
      assert_response_has_tag '#demo-fields-for input', :type => 'checkbox', :name => 'permission[can_delete]'
    end

    it 'should display correct simple fields in slim' do
      get "/slim/fields_for"
      assert_response_has_tag :form, :action => '/demo1', :id => 'demo-fields-for'
      assert_response_has_tag '#demo-fields-for input', :type => 'text', :name => 'markup_user[gender]', :value => 'male'
      assert_response_has_tag '#demo-fields-for input', :type => 'checkbox', :name => 'permission[can_edit]', :value => '1', :checked => 'checked'
      assert_response_has_tag '#demo-fields-for input', :type => 'checkbox', :name => 'permission[can_delete]'
    end
  end

  # ===========================
  # AbstractFormBuilder
  # ===========================

  describe 'for #error_messages method' do
    it 'should display correct form html with no record' do
      actual_html = standard_builder(@user_none).error_messages(:header_message => "Demo form cannot be saved")
      assert_empty actual_html
    end

    it 'should display correct form html with valid record' do
      actual_html = standard_builder.error_messages(:header_message => "Demo form cannot be saved", :style => "foo:bar", :class => "mine")
      assert_html_has_tag(actual_html, '#field-errors h2', :content => "Demo form cannot be saved")
      assert_html_has_tag(actual_html, '#field-errors ul li', :content => "B must be valid")
      assert_html_has_tag(actual_html, '#field-errors ul li', :content => "A must be present")
      assert_html_has_tag(actual_html, '#field-errors', :style => "foo:bar")
      assert_html_has_tag(actual_html, '#field-errors', :class => "mine")
    end

    it 'should display correct form in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo div.field-errors h2',     :content => "custom MarkupUser cannot be saved!"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Fake must be valid"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Second must be present"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Third must be a number"
      assert_response_has_tag '#demo2 div.field-errors h2',    :content => "custom MarkupUser cannot be saved!"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Fake must be valid"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Second must be present"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Third must be a number"
      assert_response_has_tag '#demo input', :name => 'markup_user[email]', :class => 'string invalid'
    end

    it 'should display correct form in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo div.field-errors h2',     :content => "custom MarkupUser cannot be saved!"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Fake must be valid"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Second must be present"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Third must be a number"
      assert_response_has_tag '#demo2 div.field-errors h2',    :content => "custom MarkupUser cannot be saved!"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Fake must be valid"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Second must be present"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Third must be a number"
      assert_response_has_tag '#demo input', :name => 'markup_user[email]', :class => 'string invalid'
    end

    it 'should display correct form in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo div.field-errors h2',     :content => "custom MarkupUser cannot be saved!"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Fake must be valid"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Second must be present"
      assert_response_has_tag '#demo div.field-errors ul li',  :content => "Third must be a number"
      assert_response_has_tag '#demo2 div.field-errors h2',    :content => "custom MarkupUser cannot be saved!"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Fake must be valid"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Second must be present"
      assert_response_has_tag '#demo2 div.field-errors ul li', :content => "Third must be a number"
      assert_response_has_tag '#demo input', :name => 'markup_user[email]', :class => 'string invalid'
    end
  end

  describe 'for #error_message_on method' do
    it 'should display correct form html with no record' do
      actual_html = standard_builder(@user_none).error_message_on(:name)
      assert_empty actual_html
    end

    it 'should display error for specified invalid object' do
      actual_html = standard_builder(@user).error_message_on(:a, :prepend => "foo", :append => "bar")
      assert_html_has_tag(actual_html, 'span.error', :content => "foo must be present bar")
    end

    it 'should display error for specified invalid object not matching class name' do
      @bob = mock_model("User", :first_name => "Frank", :errors => { :foo => "must be bob" })
      actual_html = standard_builder(@bob).error_message_on(:foo, :prepend => "foo", :append => "bar")
      assert_html_has_tag(actual_html, 'span.error', :content => "foo must be bob bar")
    end
  end

  describe 'for #label method' do
    it 'should display correct label html' do
      actual_html = standard_builder.label(:first_name, :class => 'large', :caption => "F. Name: ")
      assert_html_has_tag(actual_html, 'label', :class => 'large', :for => 'user_first_name', :content => "F. Name: ")
      assert_html_has_no_tag(actual_html, 'label#user_first_name')
    end

    it 'should set specific content inside the label if a block was provided' do
      actual_html = standard_builder.label(:admin, :class => 'large') { input_tag :checkbox }
      assert_html_has_tag(actual_html, 'label', :class => 'large', :for => 'user_admin', :content => "Admin: ")
      assert_html_has_tag(actual_html, 'label input[type=checkbox]')
    end

    it 'should display correct label in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo label', :content => "Login: ", :class => 'user-label'
      assert_response_has_tag '#demo label', :content => "About Me: "
      assert_response_has_tag '#demo2 label', :content => "Nickname: ", :class => 'label'
    end

    it 'should display correct label in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo label', :content => "Login: ", :class => 'user-label'
      assert_response_has_tag '#demo label', :content => "About Me: "
      assert_response_has_tag '#demo2 label', :content => "Nickname: ", :class => 'label'
    end

    it 'should display correct label in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo label', :content => "Login: ", :class => 'user-label'
      assert_response_has_tag '#demo label', :content => "About Me: "
      assert_response_has_tag '#demo2 label', :content => "Nickname: ", :class => 'label'
    end
  end

  describe 'for #hidden_field method' do
    it 'should display correct hidden field html' do
      actual_html = standard_builder.hidden_field(:session_id, :class => 'hidden')
      assert_html_has_tag(actual_html, 'input.hidden[type=hidden]', :value => "54", :id => 'user_session_id', :name => 'user[session_id]')
    end

    it 'should display correct hidden field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=hidden]', :id => 'markup_user_session_id', :value => "45"
      assert_response_has_tag '#demo2 input', :type => 'hidden', :name => 'markup_user[session_id]'
    end

    it 'should display correct hidden field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=hidden]', :id => 'markup_user_session_id', :value => "45"
      assert_response_has_tag '#demo2 input', :type => 'hidden', :name => 'markup_user[session_id]'
    end

    it 'should display correct hidden field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=hidden]', :id => 'markup_user_session_id', :value => "45"
      assert_response_has_tag '#demo2 input', :type => 'hidden', :name => 'markup_user[session_id]'
    end
  end

  describe 'for #text_field method' do
    it 'should display correct text field html' do
      actual_html = standard_builder.text_field(:first_name, :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=text]', :value => "Joe", :id => 'user_first_name', :name => 'user[first_name]')
    end

    it 'should display correct text field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input.user-text[type=text]', :id => 'markup_user_username', :value => "John"
      assert_response_has_tag '#demo2 input', :type => 'text', :class => 'input', :name => 'markup_user[username]'
    end

    it 'should display correct text field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input.user-text[type=text]', :id => 'markup_user_username', :value => "John"
      assert_response_has_tag '#demo2 input', :type => 'text', :class => 'input', :name => 'markup_user[username]'
    end

    it 'should display correct text field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input.user-text[type=text]', :id => 'markup_user_username', :value => "John"
      assert_response_has_tag '#demo2 input', :type => 'text', :class => 'input', :name => 'markup_user[username]'
    end
  end

  describe 'for #number_field method' do
    it 'should display correct number field html' do
      actual_html = standard_builder.number_field(:age, :class => 'numeric')
      assert_html_has_tag(actual_html, 'input.numeric[type=number]', :id => 'user_age', :name => 'user[age]')
    end

    it 'should display correct number field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input.numeric[type=number]', :id => 'markup_user_age'
    end

    it 'should display correct number field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input.numeric[type=number]', :id => 'markup_user_age'
    end

    it 'should display correct number field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input.numeric[type=number]', :id => 'markup_user_age'
    end
  end

  describe 'for #telephone_field method' do
    it 'should display correct telephone field html' do
      actual_html = standard_builder.telephone_field(:telephone, :class => 'numeric')
      assert_html_has_tag(actual_html, 'input.numeric[type=tel]', :id => 'user_telephone', :name => 'user[telephone]')
    end

    it 'should display correct telephone field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input.numeric[type=tel]', :id => 'markup_user_telephone'
    end

    it 'should display correct telephone field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input.numeric[type=tel]', :id => 'markup_user_telephone'
    end

    it 'should display correct telephone field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input.numeric[type=tel]', :id => 'markup_user_telephone'
    end
  end

  describe 'for #search_field method' do
    it 'should display correct search field html' do
      actual_html = standard_builder.search_field(:search, :class => 'string')
      assert_html_has_tag(actual_html, 'input.string[type=search]', :id => 'user_search', :name => 'user[search]')
    end

    it 'should display correct search field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input.string[type=search]', :id => 'markup_user_search'
    end

    it 'should display correct search field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input.string[type=search]', :id => 'markup_user_search'
    end

    it 'should display correct search field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input.string[type=search]', :id => 'markup_user_search'
    end
  end

  describe 'for #email_field method' do
    it 'should display correct email field html' do
      actual_html = standard_builder.email_field(:email, :class => 'string')
      assert_html_has_tag(actual_html, 'input.string[type=email]', :id => 'user_email', :name => 'user[email]')
    end

    it 'should display correct email field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input.string[type=email]', :id => 'markup_user_email'
    end

    it 'should display correct email field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input.string[type=email]', :id => 'markup_user_email'
    end

    it 'should display correct email field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input.string[type=email]', :id => 'markup_user_email'
    end
  end

  describe 'for #url_field method' do
    it 'should display correct url field html' do
      actual_html = standard_builder.url_field(:webpage, :class => 'string')
      assert_html_has_tag(actual_html, 'input.string[type=url]', :id => 'user_webpage', :name => 'user[webpage]')
    end

    it 'should display correct url field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input.string[type=url]', :id => 'markup_user_webpage'
    end

    it 'should display correct url field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input.string[type=url]', :id => 'markup_user_webpage'
    end

    it 'should display correct url field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input.string[type=url]', :id => 'markup_user_webpage'
    end
  end

  describe 'for #check_box method' do
    it 'should display correct checkbox html' do
      actual_html = standard_builder.check_box(:confirm_destroy, :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=checkbox]', :id => 'user_confirm_destroy', :name => 'user[confirm_destroy]')
      assert_html_has_tag(actual_html, 'input[type=hidden]', :name => 'user[confirm_destroy]', :value => '0')
    end

    it 'should display correct checkbox html when checked' do
      actual_html = standard_builder.check_box(:confirm_destroy, :checked => true)
      assert_html_has_tag(actual_html, 'input[type=checkbox]', :checked => 'checked', :name => 'user[confirm_destroy]')
    end

    it 'should display correct checkbox html as checked when object value matches' do
      @user.stubs(:show_favorites => 'human')
      actual_html = standard_builder.check_box(:show_favorites, :value => 'human')
      assert_html_has_tag(actual_html, 'input[type=checkbox]', :checked => 'checked', :name => 'user[show_favorites]')
    end

    it 'should display correct checkbox html as checked when object value is true' do
      @user.stubs(:show_favorites => true)
      actual_html = standard_builder.check_box(:show_favorites, :value => '1')
      assert_html_has_tag(actual_html, 'input[type=checkbox]', :checked => 'checked', :name => 'user[show_favorites]')
    end

    it 'should display correct checkbox html as unchecked when object value does not match' do
      @user.stubs(:show_favorites => 'alien')
      actual_html = standard_builder.check_box(:show_favorites, :value => 'human')
      assert_html_has_no_tag(actual_html, 'input[type=checkbox]', :checked => 'checked')
    end

    it 'should display correct checkbox html as unchecked when object value is false' do
      @user.stubs(:show_favorites => false)
      actual_html = standard_builder.check_box(:show_favorites, :value => '1')
      assert_html_has_no_tag(actual_html, 'input[type=checkbox]', :checked => 'checked')
    end

    it 'should display correct unchecked hidden field when specified' do
      actual_html = standard_builder.check_box(:show_favorites, :value => 'female', :uncheck_value => 'false')
      assert_html_has_tag(actual_html, 'input[type=hidden]', :name => 'user[show_favorites]', :value => 'false')
    end

    it 'should display correct checkbox in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=checkbox]', :checked => 'checked', :id => 'markup_user_remember_me', :name => 'markup_user[remember_me]'
    end

    it 'should display correct checkbox in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=checkbox]', :checked => 'checked', :id => 'markup_user_remember_me', :name => 'markup_user[remember_me]'
    end

    it 'should display correct checkbox in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=checkbox]', :checked => 'checked', :id => 'markup_user_remember_me', :name => 'markup_user[remember_me]'
    end
  end

  describe 'for #check_box_group and #radio_button_group methods' do
    it 'should display checkbox group html' do
      checkboxes = standard_builder.check_box_group(:role, :collection => @user.role_types, :fields => [:name, :id], :selected => [2,3])
      assert_html_has_tag(checkboxes, 'input[type=checkbox]', :value => '1')
      assert_html_has_no_tag(checkboxes, 'input[type=checkbox][checked]', :value => '1')
      assert_html_has_tag(checkboxes, 'input[type=checkbox]', :checked => 'checked', :value => '2')
      assert_html_has_tag(checkboxes, 'label[for=user_role_3] input[name="user[role][]"][value="3"][checked]')
    end

    it 'should display checkbox group html and extract selected values from the object' do
      checkboxes = standard_builder.check_box_group(:roles, :collection => @user.role_types, :fields => [:name, :id])
      assert_html_has_tag(checkboxes, 'input[type=checkbox][name="user[roles][]"][value="1"][checked]')
      assert_html_has_tag(checkboxes, 'input[type=checkbox][name="user[roles][]"][value="3"][checked]')
      assert_html_has_no_tag(checkboxes, 'input[type=checkbox][name="user[roles][]"][value="2"][checked]')
    end

    it 'should display radio group html' do
      radios = standard_builder.radio_button_group(:role, :options => %W(red yellow blue), :selected => 'yellow')
      assert_html_has_tag(radios, 'input[type=radio]', :value => 'red')
      assert_html_has_no_tag(radios, 'input[type=radio][checked]', :value => 'red')
      assert_html_has_tag(radios, 'input[type=radio]', :checked => 'checked', :value => 'yellow')
      assert_html_has_tag(radios, 'label[for=user_role_blue] input[name="user[role]"][value=blue]')
    end

    it 'should display radio group html and extract selected value from the object' do
      radios = standard_builder.radio_button_group(:role, :collection => @user.role_types)
      assert_html_has_tag(radios, 'input[type=radio][value="1"][checked]')
      assert_html_has_no_tag(radios, 'input[type=radio][value="2"][checked]')
    end
  end

  describe 'for #radio_button method' do
    it 'should display correct radio button html' do
      actual_html = standard_builder.radio_button(:gender, :value => 'male', :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=radio]', :id => 'user_gender_male', :name => 'user[gender]', :value => 'male')
    end

    it 'should display correct radio button html when checked' do
      actual_html = standard_builder.radio_button(:gender, :checked => true)
      assert_html_has_tag(actual_html, 'input[type=radio]', :checked => 'checked', :name => 'user[gender]')
    end

    it 'should display correct radio button html as checked when object value matches' do
      @user.stubs(:gender => 'male')
      actual_html = standard_builder.radio_button(:gender, :value => 'male')
      assert_html_has_tag(actual_html, 'input[type=radio]', :checked => 'checked', :name => 'user[gender]')
    end

    it 'should display correct radio button html as unchecked when object value does not match' do
      @user.stubs(:gender => 'male')
      actual_html = standard_builder.radio_button(:gender, :value => 'female')
      assert_html_has_no_tag(actual_html, 'input[type=radio]', :checked => 'checked')
    end

    it 'should display correct radio button in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=radio]', :id => 'markup_user_gender_male', :name => 'markup_user[gender]', :value => 'male'
      assert_response_has_tag '#demo input[type=radio]', :id => 'markup_user_gender_female', :name => 'markup_user[gender]', :value => 'female'
      assert_response_has_tag '#demo input[type=radio][checked=checked]', :id => 'markup_user_gender_male'
    end

    it 'should display correct radio button in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=radio]', :id => 'markup_user_gender_male', :name => 'markup_user[gender]', :value => 'male'
      assert_response_has_tag '#demo input[type=radio]', :id => 'markup_user_gender_female', :name => 'markup_user[gender]', :value => 'female'
      assert_response_has_tag '#demo input[type=radio][checked=checked]', :id => 'markup_user_gender_male'
    end

    it 'should display correct radio button in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=radio]', :id => 'markup_user_gender_male', :name => 'markup_user[gender]', :value => 'male'
      assert_response_has_tag '#demo input[type=radio]', :id => 'markup_user_gender_female', :name => 'markup_user[gender]', :value => 'female'
      assert_response_has_tag '#demo input[type=radio][checked=checked]', :id => 'markup_user_gender_male'
    end
  end

  describe 'for #text_area method' do
    it 'should display correct text_area html' do
      actual_html = standard_builder.text_area(:about, :class => 'large')
      assert_html_has_tag(actual_html, 'textarea.large', :id => 'user_about', :name => 'user[about]')
    end

    it 'should display correct text_area html and content' do
      actual_html = standard_builder.text_area(:about, :value => "Demo", :rows => '5', :cols => '6')
      assert_html_has_tag(actual_html, 'textarea', :id => 'user_about', :content => 'Demo', :rows => '5', :cols => '6')
    end

    it 'should display correct text_area in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'user-about'
      assert_response_has_tag '#demo2 textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'textarea'
    end

    it 'should display correct text_area in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'user-about'
      assert_response_has_tag '#demo2 textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'textarea'
    end

    it 'should display correct text_area in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'user-about'
      assert_response_has_tag '#demo2 textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'textarea'
    end
  end

  describe 'for #password_field method' do
    it 'should display correct password_field html' do
      actual_html = standard_builder.password_field(:code, :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=password]', :id => 'user_code', :name => 'user[code]')
    end

    it 'should display correct password_field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input', :type => 'password', :class => 'user-password', :value => 'secret'
      assert_response_has_tag '#demo2 input', :type => 'password', :class => 'input', :name => 'markup_user[code]'
    end

    it 'should display correct password_field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input', :type => 'password', :class => 'user-password', :value => 'secret'
      assert_response_has_tag '#demo2 input', :type => 'password', :class => 'input', :name => 'markup_user[code]'
    end

    it 'should display correct password_field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input', :type => 'password', :class => 'user-password', :value => 'secret'
      assert_response_has_tag '#demo2 input', :type => 'password', :class => 'input', :name => 'markup_user[code]'
    end
  end

  describe 'for #file_field method' do
    it 'should display correct file_field html' do
      actual_html = standard_builder.file_field(:photo, :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=file]', :id => 'user_photo', :name => 'user[photo]')
    end

    it 'should display correct file_field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo  input.user-photo', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
      assert_response_has_tag '#demo2 input.upload', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
    end

    it 'should display correct file_field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo  input.user-photo', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
      assert_response_has_tag '#demo2 input.upload', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
    end

    it 'should display correct file_field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo  input.user-photo', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
      assert_response_has_tag '#demo2 input.upload', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
    end

    it 'should display correct form html with multipart, even if no multipart option is specified' do
      actual_html = form_for(@user, '/register', :"accept-charset" => "UTF-8") { |f| f.file_field :photo }
      assert_html_has_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :enctype => "multipart/form-data")
    end

    it 'should display correct form html without multipart, if multipart option is specified false' do
      actual_html = form_for(@user, '/register', :"accept-charset" => "UTF-8", :multipart => false) { |f| f.file_field :photo }
      assert_html_has_no_tag(actual_html, 'form', :"accept-charset" => "UTF-8", :action => '/register', :enctype => "multipart/form-data")
    end

  end

  describe 'for #select method' do
    it 'should display correct select html' do
      actual_html = standard_builder.select(:state, :options => ['California', 'Texas', 'Wyoming'], :class => 'selecty')
      assert_html_has_tag(actual_html, 'select.selecty', :id => 'user_state', :name => 'user[state]')
      assert_html_has_tag(actual_html, 'select.selecty option', :count => 3)
      assert_html_has_tag(actual_html, 'select.selecty option', :value => 'California', :content => 'California')
      assert_html_has_tag(actual_html, 'select.selecty option', :value => 'Texas',      :content => 'Texas')
      assert_html_has_tag(actual_html, 'select.selecty option', :value => 'Wyoming',    :content => 'Wyoming')
    end

    it 'should display correct select html with selected item if it matches value' do
      @user.stubs(:state => 'California')
      actual_html = standard_builder.select(:state, :options => ['California', 'Texas', 'Wyoming'])
      assert_html_has_tag(actual_html, 'select', :id => 'user_state', :name => 'user[state]')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :value => 'California', :selected => 'selected')
    end

    it 'should display correct select html with selected item if it matches full value' do
      @user.stubs(:state => 'Cali')
      actual_html = standard_builder.select(:state, :options => ['Cali', 'California', 'Texas', 'Wyoming'])
      assert_html_has_tag(actual_html, 'select', :id => 'user_state', :name => 'user[state]')
      assert_html_has_tag(actual_html, 'select option', :selected => 'selected', :count => 1)
      assert_html_has_tag(actual_html, 'select option', :value => 'Cali', :selected => 'selected')
      assert_html_has_tag(actual_html, 'select option', :value => 'California')
    end

    it 'should display correct select html with multiple selected items' do
      @user.stubs(:pickles => ['foo', 'bar'])
      actual_html = standard_builder.select(
        :pickles, :options => [ ['Foo', 'foo'], ['Bar', 'bar'], ['Baz', 'baz'], ['Bar Buz', 'bar buz'] ]
      )
      assert_html_has_tag(actual_html, 'option', :value => 'foo', :content => 'Foo', :selected => 'selected')
      assert_html_has_tag(actual_html, 'option', :value => 'bar', :content => 'Bar', :selected => 'selected')
      assert_html_has_tag(actual_html, 'option', :value => 'baz', :content => 'Baz')
      assert_html_has_tag(actual_html, 'option', :value => 'bar buz', :content => 'Bar Buz')
    end

    it 'should display correct select html with include_blank true' do
      actual_html = standard_builder.select(:state, :options => ['California', 'Texas', 'Wyoming'], :include_blank => true)
      assert_html_has_tag(actual_html, 'select', :id => 'user_state', :name => 'user[state]')
      assert_html_has_tag(actual_html, 'select option', :count => 4)
      assert_html_has_tag(actual_html, 'select option:first-child', :content => '')
      assert_html_has_tag(actual_html, 'select option:first-child', :value => '')
    end

    it 'should display correct select html with include_blank string' do
      actual_html = standard_builder.select(:state, :options => ['California', 'Texas', 'Wyoming'], :include_blank => 'Select')
      assert_html_has_tag(actual_html, 'select', :id => 'user_state', :name => 'user[state]')
      assert_html_has_tag(actual_html, 'select option', :count => 4)
      assert_html_has_tag(actual_html, 'select option:first-child', :content => 'Select')
      assert_html_has_tag(actual_html, 'select option:first-child', :value => '')
    end

    it 'should display correct select html with collection passed in' do
      actual_html = standard_builder.select(:role, :collection => @user.role_types, :fields => [:name, :id])
      assert_html_has_tag(actual_html, 'select', :id => 'user_role', :name => 'user[role]')
      assert_html_has_tag(actual_html, 'select option', :count => 3)
      assert_html_has_tag(actual_html, 'select option', :value => '1', :content => 'Admin', :selected => 'selected')
      assert_html_has_tag(actual_html, 'select option', :value => '2', :content => 'Moderate')
      assert_html_has_tag(actual_html, 'select option', :value => '3', :content => 'Limited')
    end

    it 'should display correct select in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'user-about'
      assert_response_has_tag '#demo2 textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'textarea'
    end

    it 'should display correct select in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'user-about'
      assert_response_has_tag '#demo2 textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'textarea'
    end

    it 'should display correct select in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'user-about'
      assert_response_has_tag '#demo2 textarea', :name => 'markup_user[about]', :id => 'markup_user_about', :class => 'textarea'
    end
  end

  describe 'for #submit method' do
    it 'should display correct submit button html with no options' do
      actual_html = standard_builder.submit
      assert_html_has_tag(actual_html, 'input[type=submit]', :value => "Submit")
    end


    it 'should display correct submit button html with no caption' do
      actual_html = standard_builder.submit(:class => 'btn')
      assert_html_has_tag(actual_html, 'input.btn[type=submit]', :value => "Submit")
    end

    it 'should display correct submit button html with nil caption' do
      actual_html = standard_builder.submit(nil, :class => 'btn')
      assert_html_has_tag(actual_html, 'input.btn[type=submit]')
      assert actual_html !~ %r{ value \* = }x
    end

    it 'should display correct submit button html' do
      actual_html = standard_builder.submit("Commit", :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=submit]', :value => "Commit")
    end

    it 'should display correct submit button in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input', :type => 'submit', :id => 'demo-button', :class => 'success'
      assert_response_has_tag '#demo2 input', :type => 'submit', :class => 'button', :value => "Create"
    end

    it 'should display correct submit button in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input', :type => 'submit', :id => 'demo-button', :class => 'success'
      assert_response_has_tag '#demo2 input', :type => 'submit', :class => 'button', :value => "Create"
    end

    it 'should display correct submit button in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input', :type => 'submit', :id => 'demo-button', :class => 'success'
      assert_response_has_tag '#demo2 input', :type => 'submit', :class => 'button', :value => "Create"
    end
  end

  describe 'for #image_submit method' do
    before do
      @stamp = stop_time_for_test.to_i
    end

    it 'should display correct image submit button html with no options' do
      actual_html = standard_builder.image_submit('buttons/ok.png')
      assert_html_has_tag(actual_html, 'input[type=image]', :src => "/images/buttons/ok.png?#{@stamp}")
    end

    it 'should display correct image submit button html' do
      actual_html = standard_builder.image_submit('/system/ok.png', :class => 'large')
      assert_html_has_tag(actual_html, 'input.large[type=image]', :src => "/system/ok.png")
    end

    it 'should display correct image submit button in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input', :type => 'image', :id => 'image-button', :src => "/images/buttons/post.png?#{@stamp}"
      assert_response_has_tag '#demo2 input', :type => 'image', :class => 'image', :src => "/images/buttons/ok.png?#{@stamp}"
    end

    it 'should display correct image submit button in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input', :type => 'image', :id => 'image-button', :src => "/images/buttons/post.png?#{@stamp}"
      assert_response_has_tag '#demo2 input', :type => 'image', :class => 'image', :src => "/images/buttons/ok.png?#{@stamp}"
    end

    it 'should display correct image submit button in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input', :type => 'image', :id => 'image-button', :src => "/images/buttons/post.png?#{@stamp}"
      assert_response_has_tag '#demo2 input', :type => 'image', :class => 'image', :src => "/images/buttons/ok.png?#{@stamp}"
    end
  end

  describe 'for #fields_for method' do
    before do
      @telephone = mock_model("Telephone", :number => "4568769876")
      @user.stubs(:telephone).returns(@telephone)
      @businesses = [ mock_model("Business", :name => "Silver", :new_record? => false, :id => 20) ]
      @businesses <<  mock_model("Business", :name => "Gold", :new_record? => true)
      @addresses = [ mock_model("Address", :name => "Foo", :new_record? => false, :id => 20, :businesses => @businesses) ]
      @addresses <<  mock_model("Address", :name => "Bar", :new_record? => true, :businesses => @businesses)
      @user.stubs(:addresses).returns(@addresses)
    end

    it 'should display nested children fields one-to-one within form' do
      actual_html = standard_builder.fields_for :telephone do |child_form|
        child_form.label(:number) +
        child_form.text_field(:number) +
        child_form.check_box('_destroy')
      end
      assert_html_has_tag(actual_html, 'label', :for => 'user_telephone_attributes_number')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_telephone_attributes_number', :name => 'user[telephone_attributes][number]', :value => "4568769876")
      assert_html_has_tag(actual_html, 'input', :type => 'hidden', :name => 'user[telephone_attributes][_destroy]', :value => '0')
      assert_html_has_tag(actual_html, 'input', :type => 'checkbox', :id => 'user_telephone_attributes__destroy', :name => 'user[telephone_attributes][_destroy]', :value => '1')
    end

    it 'should display nested children fields one-to-many within form' do
      actual_html = standard_builder.fields_for(:addresses) do |child_form|
        html = child_form.label(:name)
        html << child_form.check_box('_destroy') unless child_form.object.new_record?
        html << child_form.text_field(:name)
      end
      # Address 1 (Saved)
      assert_html_has_tag(actual_html, 'input', :type => 'hidden', :id => 'user_addresses_attributes_0_id', :name => "user[addresses_attributes][0][id]", :value => '20')
      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_0_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_0_name', :name => 'user[addresses_attributes][0][name]')
      assert_html_has_tag(actual_html, 'input', :type => 'checkbox', :id => 'user_addresses_attributes_0__destroy', :name => 'user[addresses_attributes][0][_destroy]')
      # Address 2 (New)
      assert_html_has_no_tag(actual_html, 'input', :type => 'hidden', :id => 'user_addresses_attributes_1_id')
      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_1_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_1_name', :name => 'user[addresses_attributes][1][name]')
      assert_html_has_no_tag(actual_html, 'input', :type => 'checkbox', :id => 'user_addresses_attributes_1__destroy')
    end

    it 'should display fields for explicit instance object' do
      address = mock_model("Address", :name => "Page", :new_record? => false, :id => 40)
      actual_html = standard_builder.fields_for(:addresses, address) do |child_form|
        html = child_form.label(:name)
        html << child_form.text_field(:name)
        html << child_form.check_box('_destroy')
      end
      assert_html_has_tag(actual_html, 'input', :type => 'hidden', :id => 'user_addresses_attributes_0_id', :name => "user[addresses_attributes][0][id]", :value => '40')
      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_0_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_0_name', :name => 'user[addresses_attributes][0][name]', :value => "Page")
      assert_html_has_tag(actual_html, 'input', :type => 'checkbox', :id => 'user_addresses_attributes_0__destroy', :name => 'user[addresses_attributes][0][_destroy]', :value => '1')
    end

    it 'should display fields for collection object' do
      addresses = @addresses + [mock_model("Address", :name => "Walter", :new_record? => false, :id => 50)]
      actual_html = standard_builder.fields_for(:addresses, addresses) do |child_form|
        child_form.label(:name) +
        child_form.text_field(:name) +
        child_form.check_box('_destroy')
      end
      # Address 1
      assert_html_has_tag(actual_html, 'input', :type => 'hidden', :id => 'user_addresses_attributes_0_id', :name => "user[addresses_attributes][0][id]", :value => '20')
      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_0_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_0_name', :name => 'user[addresses_attributes][0][name]', :value => "Foo")
      assert_html_has_tag(actual_html, 'input', :type => 'checkbox', :id => 'user_addresses_attributes_0__destroy', :name => 'user[addresses_attributes][0][_destroy]')
      # Address 3
      assert_html_has_tag(actual_html, 'input', :type => 'hidden', :id => 'user_addresses_attributes_2_id', :value => '50')
      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_2_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_2_name', :name => 'user[addresses_attributes][2][name]', :value => "Walter")
      assert_html_has_tag(actual_html, 'input', :type => 'checkbox', :id => 'user_addresses_attributes_2__destroy')
    end

    it 'should display fields for arbitrarily deep nested forms' do
      actual_html = standard_builder.fields_for :addresses do |child_form|
        child_form.fields_for(:businesses) do |second_child_form|
          second_child_form.label(:name) +
          second_child_form.text_field(:name) +
          second_child_form.check_box('_destroy')
        end
      end
      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_1_businesses_attributes_0_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_1_businesses_attributes_0_name', :name => 'user[addresses_attributes][1][businesses_attributes][0][name]')
    end

    it 'should display fields for nested forms with custom indices' do
      actual_html = standard_builder.fields_for :addresses do |child_form|
        html = ''.html_safe
        child_form.object.businesses.each_with_index do |business, i|
          html += child_form.fields_for(:businesses, business, :index => ('a'..'z').to_a[i]) do |second_child_form|
            second_child_form.label(:name) +
            second_child_form.text_field(:name) +
            second_child_form.check_box('_destroy')
          end
        end
        html
      end

      assert_html_has_tag(actual_html, 'label', :for => 'user_addresses_attributes_1_businesses_attributes_a_name', :content => 'Name')
      assert_html_has_tag(actual_html, 'input', :type => 'text', :id => 'user_addresses_attributes_1_businesses_attributes_a_name', :name => 'user[addresses_attributes][1][businesses_attributes][a][name]')
    end

    it 'should display nested children fields in erb' do
      get "/erb/fields_for"
      # Telephone
      assert_response_has_tag('label', :for => 'markup_user_telephone_attributes_number')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_telephone_attributes_number', :name => 'markup_user[telephone_attributes][number]', :value => "62634576545")
      # Address 1 (Saved)
      assert_response_has_tag('input', :type => 'hidden', :id => 'markup_user_addresses_attributes_0_id', :name => "markup_user[addresses_attributes][0][id]", :value => '25')
      assert_response_has_tag('label', :for => 'markup_user_addresses_attributes_0_name', :content => 'Name')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_addresses_attributes_0_name', :name => 'markup_user[addresses_attributes][0][name]')
      assert_response_has_tag('input', :type => 'checkbox', :id => 'markup_user_addresses_attributes_0__destroy', :name => 'markup_user[addresses_attributes][0][_destroy]')
      # Address 2 (New)
      assert_response_has_no_tag('input', :type => 'hidden', :id => 'markup_user_addresses_attributes_1_id')
      assert_response_has_tag('label', :for => 'markup_user_addresses_attributes_1_name', :content => 'Name')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_addresses_attributes_1_name', :name => 'markup_user[addresses_attributes][1][name]')
      assert_response_has_no_tag('input', :type => 'checkbox', :id => 'markup_user_addresses_attributes_1__destroy')
    end

    it 'should display nested children fields in haml' do
      get "/haml/fields_for"
      # Telephone
      assert_response_has_tag('label', :for => 'markup_user_telephone_attributes_number')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_telephone_attributes_number', :name => 'markup_user[telephone_attributes][number]', :value => "62634576545")
      # Address 1 (Saved)
      assert_response_has_tag('input', :type => 'hidden', :id => 'markup_user_addresses_attributes_0_id', :name => "markup_user[addresses_attributes][0][id]", :value => '25')
      assert_response_has_tag('label', :for => 'markup_user_addresses_attributes_0_name', :content => 'Name')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_addresses_attributes_0_name', :name => 'markup_user[addresses_attributes][0][name]')
      assert_response_has_tag('input', :type => 'checkbox', :id => 'markup_user_addresses_attributes_0__destroy', :name => 'markup_user[addresses_attributes][0][_destroy]')
      # Address 2 (New)
      assert_response_has_no_tag('input', :type => 'hidden', :id => 'markup_user_addresses_attributes_1_id')
      assert_response_has_tag('label', :for => 'markup_user_addresses_attributes_1_name', :content => 'Name')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_addresses_attributes_1_name', :name => 'markup_user[addresses_attributes][1][name]')
      assert_response_has_no_tag('input', :type => 'checkbox', :id => 'markup_user_addresses_attributes_1__destroy')
    end

    it 'should display nested children fields in slim' do
      get "/slim/fields_for"
      # Telephone
      assert_response_has_tag('label', :for => 'markup_user_telephone_attributes_number')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_telephone_attributes_number', :name => 'markup_user[telephone_attributes][number]', :value => "62634576545")
      # Address 1 (Saved)
      assert_response_has_tag('input', :type => 'hidden', :id => 'markup_user_addresses_attributes_0_id', :name => "markup_user[addresses_attributes][0][id]", :value => '25')
      assert_response_has_tag('label', :for => 'markup_user_addresses_attributes_0_name', :content => 'Name')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_addresses_attributes_0_name', :name => 'markup_user[addresses_attributes][0][name]')
      assert_response_has_tag('input', :type => 'checkbox', :id => 'markup_user_addresses_attributes_0__destroy', :name => 'markup_user[addresses_attributes][0][_destroy]')
      # Address 2 (New)
      assert_response_has_no_tag('input', :type => 'hidden', :id => 'markup_user_addresses_attributes_1_id')
      assert_response_has_tag('label', :for => 'markup_user_addresses_attributes_1_name', :content => 'Name')
      assert_response_has_tag('input', :type => 'text', :id => 'markup_user_addresses_attributes_1_name', :name => 'markup_user[addresses_attributes][1][name]')
      assert_response_has_no_tag('input', :type => 'checkbox', :id => 'markup_user_addresses_attributes_1__destroy')
    end
  end

  # ===========================
  # StandardFormBuilder
  # ===========================

  describe 'for #text_field_block method' do
    it 'should display correct text field block html' do
      actual_html = standard_builder.text_field_block(:first_name, :class => 'large', :caption => "FName")
      assert_html_has_tag(actual_html, 'p label', :for => 'user_first_name', :content => "FName")
      assert_html_has_tag(actual_html, 'p input.large[type=text]', :value => "Joe", :id => 'user_first_name', :name => 'user[first_name]')
    end

    it 'should display correct text field block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_username', :content => "Nickname: ", :class => 'label'
      assert_response_has_tag '#demo2 p input', :type => 'text', :name => 'markup_user[username]', :id => 'markup_user_username'
    end

    it 'should display correct text field block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_username', :content => "Nickname: ", :class => 'label'
      assert_response_has_tag '#demo2 p input', :type => 'text', :name => 'markup_user[username]', :id => 'markup_user_username'
    end

    it 'should display correct text field block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_username', :content => "Nickname: ", :class => 'label'
      assert_response_has_tag '#demo2 p input', :type => 'text', :name => 'markup_user[username]', :id => 'markup_user_username'
    end
  end

  describe 'for #text_area_block method' do
    it 'should display correct text area block html' do
      actual_html = standard_builder.text_area_block(:about, :class => 'large', :caption => "About Me")
      assert_html_has_tag(actual_html, 'p label', :for => 'user_about', :content => "About Me")
      assert_html_has_tag(actual_html, 'p textarea', :id => 'user_about', :name => 'user[about]')
    end

    it 'should display correct text area block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_about', :content => "About: "
      assert_response_has_tag '#demo2 p textarea', :name => 'markup_user[about]', :id => 'markup_user_about'
    end

    it 'should display correct text area block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_about', :content => "About: "
      assert_response_has_tag '#demo2 p textarea', :name => 'markup_user[about]', :id => 'markup_user_about'
    end

    it 'should display correct text area block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_about', :content => "About: "
      assert_response_has_tag '#demo2 p textarea', :name => 'markup_user[about]', :id => 'markup_user_about'
    end
  end

  describe 'for #password_field_block method' do
    it 'should display correct password field block html' do
      actual_html = standard_builder.password_field_block(:keycode, :class => 'large', :caption => "Code: ")
      assert_html_has_tag(actual_html, 'p label', :for => 'user_keycode', :content => "Code: ")
      assert_html_has_tag(actual_html, 'p input.large[type=password]', :id => 'user_keycode', :name => 'user[keycode]')
    end

    it 'should display correct password field block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_code', :content => "Code: "
      assert_response_has_tag '#demo2 p input', :type => 'password', :name => 'markup_user[code]', :id => 'markup_user_code'
    end

    it 'should display correct password field block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_code', :content => "Code: "
      assert_response_has_tag '#demo2 p input', :type => 'password', :name => 'markup_user[code]', :id => 'markup_user_code'
    end

    it 'should display correct password field block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_code', :content => "Code: "
      assert_response_has_tag '#demo2 p input', :type => 'password', :name => 'markup_user[code]', :id => 'markup_user_code'
    end
  end

  describe 'for #file_field_block method' do
    it 'should display correct file field block html' do
      actual_html = standard_builder.file_field_block(:photo, :class => 'large', :caption => "Photo: ")
      assert_html_has_tag(actual_html, 'p label', :for => 'user_photo', :content => "Photo: ")
      assert_html_has_tag(actual_html, 'p input.large[type=file]', :id => 'user_photo', :name => 'user[photo]')
    end

    it 'should display correct file field block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_photo', :content => "Photo: "
      assert_response_has_tag '#demo2 p input.upload', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
    end

    it 'should display correct file field block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_photo', :content => "Photo: "
      assert_response_has_tag '#demo2 p input.upload', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
    end

    it 'should display correct file field block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_photo', :content => "Photo: "
      assert_response_has_tag '#demo2 p input.upload', :type => 'file', :name => 'markup_user[photo]', :id => 'markup_user_photo'
    end
  end

  describe 'for #check_box_block method' do
    it 'should display correct check box block html' do
      actual_html = standard_builder.check_box_block(:remember_me, :class => 'large', :caption => "Remember session?")
      assert_html_has_tag(actual_html, 'p label', :for => 'user_remember_me', :content => "Remember session?")
      assert_html_has_tag(actual_html, 'p input.large[type=checkbox]', :id => 'user_remember_me', :name => 'user[remember_me]')
    end

    it 'should display correct check box block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_remember_me', :content => "Remember me: "
      assert_response_has_tag '#demo2 p input.checker', :type => 'checkbox', :name => 'markup_user[remember_me]'
    end

    it 'should display correct check box block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_remember_me', :content => "Remember me: "
      assert_response_has_tag '#demo2 p input.checker', :type => 'checkbox', :name => 'markup_user[remember_me]'
    end

    it 'should display correct check box block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_remember_me', :content => "Remember me: "
      assert_response_has_tag '#demo2 p input.checker', :type => 'checkbox', :name => 'markup_user[remember_me]'
    end
  end

  describe 'for #select_block method' do
    it 'should display correct select_block block html' do
      actual_html = standard_builder.select_block(:country, :options => ['USA', 'Canada'], :class => 'large', :caption => "Your country")
      assert_html_has_tag(actual_html, 'p label', :for => 'user_country', :content => "Your country")
      assert_html_has_tag(actual_html, 'p select', :id => 'user_country', :name => 'user[country]')
      assert_html_has_tag(actual_html, 'p select option', :content => 'USA')
      assert_html_has_tag(actual_html, 'p select option', :content => 'Canada')
    end

    it 'should display correct select_block block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_state', :content => "State: "
      assert_response_has_tag '#demo2 p select', :name => 'markup_user[state]', :id => 'markup_user_state'
      assert_response_has_tag '#demo2 p select option',  :content => 'California'
      assert_response_has_tag '#demo2 p select option',  :content => 'Texas'
    end

    it 'should display correct select_block block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_state', :content => "State: "
      assert_response_has_tag '#demo2 p select', :name => 'markup_user[state]', :id => 'markup_user_state'
    end

    it 'should display correct select_block block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p label', :for => 'markup_user_state', :content => "State: "
      assert_response_has_tag '#demo2 p select', :name => 'markup_user[state]', :id => 'markup_user_state'
    end
  end

  describe 'for #submit_block method' do
    it 'should display correct submit block html' do
      actual_html = standard_builder.submit_block("Update", :class => 'large')
      assert_html_has_tag(actual_html, 'p input.large[type=submit]', :value => 'Update')
    end

    it 'should display correct submit block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p input', :type => 'submit', :class => 'button'
    end

    it 'should display correct submit block in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo2 p input', :type => 'submit', :class => 'button'
    end

    it 'should display correct submit block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p input', :type => 'submit', :class => 'button'
    end
  end

  describe 'for #image_submit_block method' do
    before do
      @stamp = stop_time_for_test.to_i
    end

    it 'should display correct image submit block html' do
      actual_html = standard_builder.image_submit_block("buttons/ok.png", :class => 'large')
      assert_html_has_tag(actual_html, 'p input.large[type=image]', :src => "/images/buttons/ok.png?#{@stamp}")
    end

    it 'should display correct image submit block in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo2 p input', :type => 'image', :class => 'image', :src => "/images/buttons/ok.png?#{@stamp}"
    end

    it 'should display correct image submit block in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo2 p input', :type => 'image', :class => 'image', :src => "/images/buttons/ok.png?#{@stamp}"
    end
  end

  describe 'for #datetime_field method' do
    it 'should display correct datetime field html' do
      actual_html = standard_builder.datetime_field(:datetime)
      assert_html_has_tag(actual_html, 'input[type=datetime]', :id => 'user_datetime', :name => 'user[datetime]')
    end

    it 'should format DateTime to correct value if min and max and value options exist' do
      max = DateTime.new(2000, 4, 1, 12, 0, 0)
      min = DateTime.new(1993, 2, 24, 12, 30, 45)
      value = DateTime.new(2000, 4, 1, 12, 0, 0)
      actual_html = standard_builder.datetime_field(:datetime, :max => max, :min => min, :value => value)
      expected = {
        :id => 'user_datetime',
        :max => "2000-04-01T12:00:00.000+0000",
        :min => "1993-02-24T12:30:45.000+0000",
        :value => "2000-04-01T12:00:00.000+0000"
      }
      assert_html_has_tag(actual_html, 'input[type=datetime]', expected)
    end

    it 'should display correct datetime field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=datetime]', :id => 'markup_user_datetime', :max => "2000-04-01T12:00:00.000+0000"
    end

    it 'should display correct datetime field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=datetime]', :id => 'markup_user_datetime', :max => "2000-04-01T12:00:00.000+0000"
    end

    it 'should display correct datetime field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=datetime]', :id => 'markup_user_datetime', :max => "2000-04-01T12:00:00.000+0000"
    end
  end

  describe 'for #datetime_local_field method' do
    it 'should display correct datetime-local field html' do
      actual_html = standard_builder.datetime_local_field(:datetime_local)
      assert_html_has_tag(actual_html, 'input[type=datetime-local]', :id => 'user_datetime_local', :name => 'user[datetime_local]')
    end

    it 'should format DateTime to correct value if min and max and value options exist' do
      max = DateTime.new(2000, 4, 1, 12, 0, 0)
      min = DateTime.new(1993, 2, 24, 12, 30, 45)
      value = DateTime.new(2000, 4, 1, 12, 0, 0)
      actual_html = standard_builder.datetime_local_field(:datetime_local, :max => max, :min => min, :value => value)
      expected = {
        :id => 'user_datetime_local',
        :max => "2000-04-01T12:00:00",
        :min => "1993-02-24T12:30:45",
        :value => "2000-04-01T12:00:00"
      }
      assert_html_has_tag(actual_html, 'input[type=datetime-local]', expected)
    end

    it 'should display correct datetime-local field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=datetime-local]', :id => 'markup_user_datetime_local'
    end

    it 'should display correct datetime-local field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=datetime-local]', :id => 'markup_user_datetime_local'
    end

    it 'should display correct datetime-local field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=datetime-local]', :id => 'markup_user_datetime_local'
    end
  end

  describe 'for #date_field method' do
    it 'should display correct date field html' do
      actual_html = standard_builder.date_field(:date)
      assert_html_has_tag(actual_html, 'input[type=date]', :id => 'user_date', :name => 'user[date]')
    end

    it 'should format DateTime to correct value if min and max and value options exist' do
      max = DateTime.new(2000, 4, 1)
      min = DateTime.new(1993, 2, 24)
      value = DateTime.new(2000, 4, 1)
      actual_html = standard_builder.date_field(:date, :max => max, :min => min, :value => value)
      expected = {
        :id => 'user_date',
        :max => "2000-04-01",
        :min => "1993-02-24",
        :value => "2000-04-01"
      }
      assert_html_has_tag(actual_html, 'input[type=date]', expected)
    end

    it 'should display correct date field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=date]', :id => 'markup_user_date'
    end

    it 'should display correct date field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=date]', :id => 'markup_user_date'
    end

    it 'should display correct date field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=date]', :id => 'markup_user_date'
    end
  end

  describe 'for #month_field method' do
    it 'should display correct month field html' do
      actual_html = standard_builder.month_field(:month)
      assert_html_has_tag(actual_html, 'input[type=month]', :id => 'user_month', :name => 'user[month]')
    end

    it 'should format DateTime to correct value if min and max and value options exist' do
      max = DateTime.new(2000, 4, 1)
      min = DateTime.new(1993, 2, 24)
      value = DateTime.new(2000, 4, 1)
      actual_html = standard_builder.month_field(:month, :max => max, :min => min, :value => value)
      expected = {
        :id => 'user_month',
        :max => "2000-04",
        :min => "1993-02",
        :value => "2000-04"
      }
      assert_html_has_tag(actual_html, 'input[type=month]', expected)
    end

    it 'should display correct month field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=month]', :id => 'markup_user_month'
    end

    it 'should display correct month field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=month]', :id => 'markup_user_month'
    end

    it 'should display correct month field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=month]', :id => 'markup_user_month'
    end
  end

  describe 'for #week_field method' do
    it 'should display correct week field html' do
      actual_html = standard_builder.week_field(:week)
      assert_html_has_tag(actual_html, 'input[type=week]', :id => 'user_week', :name => 'user[week]')
    end

    it 'should format DateTime to correct value if min and max and value options exist' do
      max = DateTime.new(2000, 4, 1)
      min = DateTime.new(1993, 2, 24)
      value = DateTime.new(2000, 4, 1)
      actual_html = standard_builder.week_field(:week, :max => max, :min => min, :value => value)
      expected = {
        :id => 'user_week',
        :max => "2000-W13",
        :min => "1993-W08",
        :value => "2000-W13"
      }
      assert_html_has_tag(actual_html, 'input[type=week]', expected)
    end

    it 'should display correct week field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=week]', :id => 'markup_user_week'
    end

    it 'should display correct week field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=week]', :id => 'markup_user_week'
    end

    it 'should display correct week field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=week]', :id => 'markup_user_week'
    end
  end

  describe 'for #time_field method' do
    it 'should display correct time field html' do
      actual_html = standard_builder.time_field(:time)
      assert_html_has_tag(actual_html, 'input[type=time]', :id => 'user_time', :name => 'user[time]')
    end

    it 'should format DateTime to correct value if min and max and value options exist' do
      max = Time.new(2008, 6, 21, 13, 30, 0)
      min = Time.new(1993, 2, 24, 1, 19, 12)
      value = Time.new(2008, 6, 21, 13, 30, 0)
      actual_html = standard_builder.time_field(:time, :max => max, :min => min, :value => value)
      expected = {
        :id => 'user_time',
        :max => "13:30:00.000",
        :min => "01:19:12.000",
        :value => "13:30:00.000"
      }
      assert_html_has_tag(actual_html, 'input[type=time]', expected)
    end

    it 'should display correct time field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=time]', :id => 'markup_user_time'
    end

    it 'should display correct time field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=time]', :id => 'markup_user_time'
    end

    it 'should display correct time field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=time]', :id => 'markup_user_time'
    end
  end

  describe 'for #color_field method' do
    it 'should display correct color field html' do
      actual_html = standard_builder.color_field(:color)
      assert_html_has_tag(actual_html, 'input[type=color]', :id => 'user_color', :name => 'user[color]')
    end

    it 'should display correct color field in haml' do
      get "/haml/form_for"
      assert_response_has_tag '#demo input[type=color]', :id => 'markup_user_color', :value => "#ff0000"
    end

    it 'should display correct color field in erb' do
      get "/erb/form_for"
      assert_response_has_tag '#demo input[type=color]', :id => 'markup_user_color', :value => "#ff0000"
    end

    it 'should display correct color field in slim' do
      get "/slim/form_for"
      assert_response_has_tag '#demo input[type=color]', :id => 'markup_user_color', :value => "#ff0000"
    end
  end
end
