activate :autoprefixer do |config|
  config.browsers = ['Safari 5', 'Firefox 15']
  config.cascade  = true
end

# Middleman 3
if defined? compass_config
  compass_config do |config|
    config.output_style = :expanded
  end
end
