require "./lib/contracts"
require "benchmark"
require "rubygems"
require "method_profiler"
require "ruby-prof"

class Obj
  include Contracts

  attr_accessor :value
  def initialize value
    @value = value
  end

  Contract Num, Num => Num
  def contracts_add a, b
    a + b
  end
end

class ObjWithInvariants
  include Contracts
  include Contracts::Invariants

  invariant(:value_not_nil) { value != nil }
  invariant(:value_not_string) { !value.is_a?(String) }

  attr_accessor :value
  def initialize value
    @value = value
  end

  Contract Num, Num => Num
  def contracts_add a, b
    a + b
  end
end

def benchmark
  obj = Obj.new(3)
  obj_with_invariants = ObjWithInvariants.new(3)

  Benchmark.bm 30 do |x|
    x.report "testing contracts add" do
      1_000_000.times do |_|
        obj.contracts_add(rand(1000), rand(1000))
      end
    end
    x.report "testing contracts add with invariants" do
      1_000_000.times do |_|
        obj_with_invariants.contracts_add(rand(1000), rand(1000))
      end
    end
  end
end

def profile
  obj_with_invariants = ObjWithInvariants.new(3)

  profilers = []
  profilers << MethodProfiler.observe(Contract)
  profilers << MethodProfiler.observe(Object)
  profilers << MethodProfiler.observe(Contracts::Support)
  profilers << MethodProfiler.observe(Contracts::Invariants)
  profilers << MethodProfiler.observe(Contracts::Invariants::InvariantExtension)
  profilers << MethodProfiler.observe(UnboundMethod)

  10_000.times do |_|
    obj_with_invariants.contracts_add(rand(1000), rand(1000))
  end

  profilers.each { |p| puts p.report }
end

def ruby_prof
  RubyProf.start

  obj_with_invariants = ObjWithInvariants.new(3)

  100_000.times do |_|
    obj_with_invariants.contracts_add(rand(1000), rand(1000))
  end

  result = RubyProf.stop
  printer = RubyProf::FlatPrinter.new(result)
  printer.print(STDOUT)
end

benchmark
profile
ruby_prof if ENV["FULL_BENCH"] # takes some time
