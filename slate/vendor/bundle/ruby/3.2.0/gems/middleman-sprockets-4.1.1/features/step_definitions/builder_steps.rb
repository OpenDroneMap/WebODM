Given /^a built app$/ do
  step %{I run `middleman build --verbose`}
end

Given /^a successfully built app$/ do
  step %{a built app}
  step %{was successfully built}
end
