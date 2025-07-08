PADRINO_ROOT = File.dirname(__FILE__) unless defined? PADRINO_ROOT

class RenderDemo2 < Padrino::Application
  register Padrino::Rendering

  set :reload, true
end

RenderDemo2.controllers :blog do
  get '/' do
    render 'post'
  end

  get '/override' do
    render 'post', :layout => RenderDemo2.layout_path('specific') 
  end
end

RenderDemo2.controllers :article, :comment do
  get '/' do
    render 'show'
  end
end

Padrino.load!
