Given /^I have a Rack app with Rack::LiveReload$/ do
  @app = Rack::Builder.new do
    use Rack::LiveReload

    run lambda { |env| [ 200, { 'Content-Type' => 'text/html' }, [ "<html><head></head><body></body></html>" ] ] }
  end
end
