SimpleCov.start do
  add_filter "/features/"
  add_filter "/fixtures/"
  add_filter "/spec/"
  add_filter "/tmp"
  add_filter "/vendor"

  add_group "lib", "lib"
end
