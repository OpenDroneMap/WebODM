activate :autoprefixer, browsers: ['Safari 5', 'Firefox 15'], cascade: false

# Middleman 3
if defined? compass_config
  compass_config do |config|
    config.output_style = :expanded
  end
end
