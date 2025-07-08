When /^I make a request to "([^"]*)" with the following headers:$/ do |uri, table|
  @request = Rack::MockRequest.new(@app)

  @response = @request.get(uri, table.rows_hash)
end

