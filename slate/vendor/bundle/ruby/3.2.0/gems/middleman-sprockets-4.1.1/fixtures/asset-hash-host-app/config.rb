activate :sprockets
activate :asset_hash
activate :directory_indexes
activate :asset_host do |c|
  c.host = 'http://middlemanapp.com'
end
