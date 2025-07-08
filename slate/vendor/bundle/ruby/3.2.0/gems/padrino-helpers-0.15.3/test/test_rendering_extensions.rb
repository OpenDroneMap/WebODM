require File.expand_path(File.dirname(__FILE__) + '/helper')

describe "Rendering Extensions" do
  describe 'for haml' do
    it 'should render haml_tag correctly' do
      skip unless Padrino::Helpers::OutputHelpers.handlers[:haml].to_s == "Padrino::Helpers::OutputHelpers::HamlHandler"

      mock_app do
        get('/') { render :haml, '-haml_tag :div'}
      end

      get '/'
      assert_match '<div></div>', last_response.body
    end
  end
end
