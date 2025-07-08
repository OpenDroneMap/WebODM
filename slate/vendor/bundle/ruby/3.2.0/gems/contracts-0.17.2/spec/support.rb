def with_enabled_no_contracts
  no_contracts = ENV["NO_CONTRACTS"]
  ENV["NO_CONTRACTS"] = "true"
  yield
  ENV["NO_CONTRACTS"] = no_contracts
end

def ruby_version
  RUBY_VERSION.match(/\d+\.\d+/)[0].to_f
end
