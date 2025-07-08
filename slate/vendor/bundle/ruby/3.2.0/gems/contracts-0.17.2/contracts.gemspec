# frozen_string_literal: true

require File.expand_path(File.join(__FILE__, "../lib/contracts/version"))

Gem::Specification.new do |s|
  s.name        = "contracts"
  s.version     = Contracts::VERSION
  s.summary     = "Contracts for Ruby."
  s.description = "This library provides contracts for Ruby. Contracts let you clearly express how your code behaves, and free you from writing tons of boilerplate, defensive code."
  s.author      = "Aditya Bhargava"
  s.email       = "bluemangroupie@gmail.com"
  s.files       = `git ls-files`.split("\n")
  s.homepage    = "https://github.com/egonSchiele/contracts.ruby"
  s.license     = "BSD-2-Clause"
  s.required_ruby_version = [">= 3.0", "< 4"]
end
