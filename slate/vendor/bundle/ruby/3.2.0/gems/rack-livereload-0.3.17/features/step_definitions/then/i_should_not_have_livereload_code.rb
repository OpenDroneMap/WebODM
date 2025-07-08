Then /^I should not have any Rack::LiveReload code$/ do
  expect(@response.body).not_to include("rack/livereload.js")
end

