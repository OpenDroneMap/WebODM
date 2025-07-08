# step definition for testing line number markup
Then(/^I should not see line numbers markup$/) do
  expect(page).not_to have_selector("pre.lineno")
end
