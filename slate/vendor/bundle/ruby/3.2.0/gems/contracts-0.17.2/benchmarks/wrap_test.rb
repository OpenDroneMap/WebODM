require "benchmark"

module Wrapper
  def self.extended(klass)
    klass.class_eval do
      @@methods = {}
      def self.methods
        @@methods
      end
      def self.set_method k, v
        @@methods[k] = v
      end
    end
  end

  def method_added name
    return if methods.include?(name)
    puts "#{name} added"
    set_method(name, instance_method(name))
    class_eval %{
      def #{name}(*args)
        self.class.methods[#{name.inspect}].bind(self).call(*args)
      end
    }, __FILE__, __LINE__ + 1
  end
end

class NotWrapped
  def add a, b
    a + b
  end
end

class Wrapped
  extend ::Wrapper
  def add a, b
    a + b
  end
end

w = Wrapped.new
nw = NotWrapped.new
# p w.add(1, 4)
# exit
# 30 is the width of the output column
Benchmark.bm 30 do |x|
  x.report "wrapped" do
    100_000.times do |_|
      w.add(rand(1000), rand(1000))
    end
  end
  x.report "not wrapped" do
    100_000.times do |_|
      nw.add(rand(1000), rand(1000))
    end
  end
end
