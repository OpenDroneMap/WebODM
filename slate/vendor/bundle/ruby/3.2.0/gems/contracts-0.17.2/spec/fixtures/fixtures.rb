require "date"

C = Contracts

class A
  include Contracts::Core

  Contract C::Num => C::Num
  def self.a_class_method x
    x + 1
  end

  def good
    true
  end

  Contract C::Num => C::Num
  def triple x
    x * 3
  end

  Contract C::Num => C::Num
  def instance_and_class_method x
    x * 2
  end

  Contract String => String
  def self.instance_and_class_method x
    x * 2
  end
end

class B
  include Contracts::Core

  def bad
    false
  end

  Contract String => String
  def triple x
    x * 3
  end
end

class F
  include Contracts::Core

  def good
    false
  end

  def bad
    true
  end
end

class EmptyCont
  def self.to_s
    ""
  end
end

class GenericExample
  include Contracts::Core

  Contract C::Num => C::Num
  def self.a_class_method x
    x + 1
  end

  Contract C::Num => nil
  def bad_double(x)
    x * 2
  end

  Contract C::Num => C::Num
  def double(x)
    x * 2
  end

  Contract 123, nil => nil
  def constanty(num, nul)
    0
  end

  Contract String => nil
  def hello(name)
  end

  Contract lambda { |x| x.is_a? Numeric } => C::Num
  def square(x)
    x ** 2
  end

  Contract [C::Num, C::Num, C::Num] => C::Num
  def sum_three(vals)
    vals.inject(0) do |acc, x|
      acc + x
    end
  end

  Contract ({ :name => String, :age => Integer }) => nil
  def person(data)
  end

  Contract C::StrictHash[{ :name => String, :age => Integer }] => nil
  def strict_person(data)
  end

  Contract ({ :rigged => C::Or[TrueClass, FalseClass] }) => nil
  def hash_complex_contracts(data)
  end

  Contract ({ :rigged => C::Bool,
              :contents => { :kind => C::Or[String, Symbol],
                             :total => C::Num }
            }) => nil
  def nested_hash_complex_contracts(data)
  end

  Contract C::KeywordArgs[:name => String, :age => Integer] => nil
  def person_keywordargs(name: "name", age: 10)
  end

  Contract C::KeywordArgs[:hash => C::HashOf[Symbol, C::Num]] => nil
  def hash_keywordargs(hash:)
  end

  Contract (/foo/) => nil
  def should_contain_foo(s)
  end

  Contract ({ :host => /foo/ }) => nil
  def hash_containing_foo(s)
  end

  Contract C::ArrayOf[/foo/] => nil
  def array_containing_foo(s)
  end

  Contract [C::Or[TrueClass, FalseClass]] => nil
  def array_complex_contracts(data)
  end

  Contract [C::Bool, [C::Or[String, Symbol]]] => nil
  def nested_array_complex_contracts(data)
  end

  Contract [
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol]
  ] => nil
  def long_array_param_contracts(data)
  end

  Contract C::None => [
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol],
    C::Or[String, Symbol]
  ]
  def long_array_return_contracts
  end

  Contract Proc => C::Any
  def do_call(&block)
    block.call
  end

  Contract C::Args[C::Num], C::Maybe[Proc] => C::Any
  def maybe_call(*vals, &block)
    block.call if block
    vals
  end

  Contract C::Args[C::Num] => C::Num
  def sum(*vals)
    vals.inject(0) do |acc, val|
      acc + val
    end
  end

  Contract C::Args[C::Num], Proc => C::Num
  def with_partial_sums(*vals, &blk)
    sum = vals.inject(0) do |acc, val|
      blk[acc]
      acc + val
    end
    blk[sum]
  end

  Contract C::Args[C::Num], C::Func[C::Num => C::Num] => C::Num
  def with_partial_sums_contracted(*vals, &blk)
    sum = vals.inject(0) do |acc, val|
      blk[acc]
      acc + val
    end
    blk[sum]
  end

  # Important to use different arg types or it falsely passes
  Contract C::Num, C::Args[String] => C::ArrayOf[String]
  def arg_then_splat(n, *vals)
    vals.map { |v| v * n }
  end

  Contract C::Num, Proc => nil
  def double_with_proc(x, &blk)
    blk.call(x * 2)
    nil
  end

  Contract C::Pos => nil
  def pos_test(x)
  end

  Contract C::Neg => nil
  def neg_test(x)
  end

  Contract C::Nat => nil
  def nat_test(x)
  end

  Contract C::Any => nil
  def show(x)
  end

  Contract C::None => nil
  def fail_all(x)
  end

  Contract C::Or[C::Num, String] => nil
  def num_or_string(x)
  end

  Contract C::Xor[C::RespondTo[:good], C::RespondTo[:bad]] => nil
  def xor_test(x)
  end

  Contract C::And[A, C::RespondTo[:good]] => nil
  def and_test(x)
  end

  Contract C::Enum[:a, :b, :c] => nil
  def enum_test(x)
  end

  Contract C::RespondTo[:good] => nil
  def responds_test(x)
  end

  Contract C::Send[:good] => nil
  def send_test(x)
  end

  Contract C::Not[nil] => nil
  def not_nil(x)
  end

  Contract C::ArrayOf[C::Num] => C::Num
  def product(vals)
    vals.inject(1) do |acc, x|
      acc * x
    end
  end

  Contract C::SetOf[C::Num] => C::Num
  def product_from_set(vals)
    vals.inject(1) do |acc, x|
      acc * x
    end
  end

  Contract C::RangeOf[C::Num] => C::Num
  def first_in_range_num(r)
    r.first
  end

  Contract C::RangeOf[Date] => Date
  def first_in_range_date(r)
    r.first
  end

  Contract C::DescendantOf[Enumerable] => nil
  def enumerable_descendant_test(enum)
  end

  Contract C::Bool => nil
  def bool_test(x)
  end

  Contract C::Num
  def no_args
    1
  end

  # This function has a contract which says it has no args,
  # but the function does have args.
  Contract nil => C::Num
  def old_style_no_args
    2
  end

  Contract C::ArrayOf[C::Num], C::Func[C::Num => C::Num] => C::ArrayOf[C::Num]
  def map(arr, func)
    ret = []
    arr.each do |x|
      ret << func[x]
    end
    ret
  end

  Contract C::ArrayOf[C::Any], Proc => C::ArrayOf[C::Any]
  def tutorial_map(arr, func)
    ret = []
    arr.each do |x|
      ret << func[x]
    end
    ret
  end

  # Need to test Func with weak contracts for other args
  # and changing type from input to output otherwise it falsely passes!
  Contract Array, C::Func[String => C::Num] => Array
  def map_plain(arr, func)
    arr.map do |x|
      func[x]
    end
  end

  Contract C::None => C::Func[String => C::Num]
  def lambda_with_wrong_return
    lambda { |x| x }
  end

  Contract C::None => C::Func[String => C::Num]
  def lambda_with_correct_return
    lambda { |x| x.length }
  end

  Contract C::Num => C::Num
  def default_args(x = 1)
    2
  end

  Contract C::Maybe[C::Num] => C::Maybe[C::Num]
  def maybe_double x
    if x.nil?
      nil
    else
      x * 2
    end
  end

  Contract C::HashOf[Symbol, C::Num] => C::Num
  def gives_max_value(hash)
    hash.values.max
  end

  Contract C::HashOf[Symbol => C::Num] => C::Num
  def pretty_gives_max_value(hash)
    hash.values.max
  end

  Contract EmptyCont => C::Any
  def using_empty_contract(a)
    a
  end

  Contract (1..10) => nil
  def method_with_range_contract(x)
  end

  Contract String
  def a_private_method
    "works"
  end
  private :a_private_method

  Contract String
  def a_protected_method
    "works"
  end
  protected :a_protected_method

  private

  Contract String
  def a_really_private_method
    "works for sure"
  end

  protected

  Contract String
  def a_really_protected_method
    "works for sure"
  end
end

# for testing inheritance
class Parent
  include Contracts::Core

  Contract C::Num => C::Num
  def double x
    x * 2
  end
end

class Child < Parent
end

class GenericExample
  Contract Parent => Parent
  def id_ a
    a
  end

  Contract C::Exactly[Parent] => nil
  def exactly_test(x)
  end
end

# for testing equality
class Foo
end
module Bar
end
Baz = 1

class GenericExample
  Contract C::Eq[Foo] => C::Any
  def eq_class_test(x)
  end

  Contract C::Eq[Bar] => C::Any
  def eq_module_test(x)
  end

  Contract C::Eq[Baz] => C::Any
  def eq_value_test(x)
  end
end

# pattern matching example with possible deep contract violation
class PatternMatchingExample
  include Contracts::Core

  class Success
    attr_accessor :request
    def initialize request
      @request = request
    end

    def ==(other)
      request == other.request
    end
  end

  class Failure
  end

  Response = C::Or[Success, Failure]

  class StringWithHello
    def self.valid?(string)
      string.is_a?(String) && !!string.match(/hello/i)
    end
  end

  Contract Success => Response
  def process_request(status)
    Success.new(decorated_request(status.request))
  end

  Contract Failure => Response
  def process_request(status)
    Failure.new
  end

  Contract StringWithHello => String
  def decorated_request(request)
    request + "!"
  end

  Contract C::Num, String => String
  def do_stuff(number, string)
    "foo"
  end

  Contract C::Num, String, C::Num => String
  def do_stuff(number, string, other_number)
    "bar"
  end

  Contract C::Num => C::Num
  def double x
    "bad"
  end

  Contract String => String
  def double x
    x * 2
  end
end

# invariant example (silliest implementation ever)
class MyBirthday
  include Contracts::Core
  include Contracts::Invariants

  invariant(:day) { 1 <= day && day <= 31 }
  invariant(:month) { 1 <= month && month <= 12 }

  attr_accessor :day, :month
  def initialize(day, month)
    @day = day
    @month = month
  end

  Contract C::None => Integer
  def silly_next_day!
    self.day += 1
  end

  Contract C::None => Integer
  def silly_next_month!
    self.month += 1
  end

  Contract C::None => Integer
  def clever_next_day!
    return clever_next_month! if day == 31
    self.day += 1
  end

  Contract C::None => Integer
  def clever_next_month!
    return next_year! if month == 12
    self.month += 1
    self.day = 1
  end

  Contract C::None => Integer
  def next_year!
    self.month = 1
    self.day = 1
  end
end

class SingletonClassExample
  # This turned out to be required line here to make singleton classes
  # work properly under all platforms. Not sure if it worth trying to
  # do something with it.
  include Contracts::Core

  class << self
    Contract String => String
    def hoge(str)
      "super#{str}"
    end

    Contract C::Num, C::Num => C::Num
    def add(a, b)
      a + b
    end
  end
end

with_enabled_no_contracts do
  class NoContractsSimpleExample
    include Contracts::Core

    Contract String => nil
    def some_method(x)
      nil
    end
  end

  class NoContractsInvariantsExample
    include Contracts::Core
    include Contracts::Invariants

    attr_accessor :day

    invariant(:day_rule) { 1 <= day && day <= 7 }

    Contract C::None => nil
    def next_day
      self.day += 1
    end
  end

  class NoContractsPatternMatchingExample
    include Contracts::Core

    Contract 200, String => String
    def on_response(status, body)
      body + "!"
    end

    Contract Integer, String => String
    def on_response(status, body)
      "error #{status}: #{body}"
    end
  end
end

module ModuleExample
  include Contracts::Core

  Contract C::Num, C::Num => C::Num
  def plus(a, b)
    a + b
  end

  Contract String => String
  def self.hoge(str)
    "super#{str}"
  end

  class << self
    Contract String => nil
    def eat(food)
      # yummy
      nil
    end
  end
end

class KlassWithModuleExample
  include ModuleExample
end

class SingletonInheritanceExample
  include Contracts::Core

  Contract C::Any => C::Any
  def self.a_contracted_self
    self
  end
end

class SingletonInheritanceExampleSubclass < SingletonInheritanceExample
  class << self
    Contract Integer => Integer
    def num(int)
      int
    end
  end
end

class BareOptionalContractUsed
  include Contracts::Core

  Contract C::Num, C::Optional[C::Num] => nil
  def something(a, b)
    nil
  end
end

module ModuleContractExample
  include Contracts::Core

  module AModule
  end

  module AnotherModule
  end

  module InheritedModule
    include AModule
  end

  class AClassWithModule
    include AModule
  end

  class AClassWithoutModule
  end

  class AClassWithAnotherModule
    include AnotherModule
  end

  class AClassWithInheritedModule
    include InheritedModule
  end

  class AClassWithBothModules
    include AModule
    include AnotherModule
  end

  Contract AModule => Symbol
  def self.hello(thing)
    :world
  end
end

module ModuleWithContracts
  def self.included(base)
    base.extend ClassMethods
  end

  module ClassMethods
    include Contracts::Core

    Contract C::None => String
    def foo
      "bar"
    end
  end
end
