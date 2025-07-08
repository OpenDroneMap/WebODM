# The contracts.ruby tutorial

## Introduction

contracts.ruby brings code contracts to the Ruby language. Code contracts allow you make some assertions about your code, and then checks them to make sure they hold. This lets you

- catch bugs faster
- make it very easy to catch certain types of bugs
- make sure that the user gets proper messaging when a bug occurs.

## Installation

    gem install contracts

## Basics

A simple example:

```ruby
Contract Contracts::Num, Contracts::Num => Contracts::Num
def add(a, b)
  a + b
end
```

Here, the contract is `Contract Num, Num => Num`. This says that the `add` function takes two numbers and returns a number.

Copy this code into a file and run it:

```ruby
require 'contracts'

class Math
  include Contracts::Core

  Contract Contracts::Num, Contracts::Num => Contracts::Num
  def self.add(a, b)
    a + b
  end
end

puts Math.add(1, "foo")
```

You'll see a detailed error message like so:

    ./contracts.rb:60:in `failure_callback': Contract violation: (RuntimeError)
        Expected: Contracts::Num,
        Actual: "foo"
        Value guarded in: Object::add
        With Contract: Contracts::Num, Contracts::Num
        At: foo.rb:6

That tells you that your contract was violated! `add` expected a `Num`, and got a string (`"foo"`) instead.
By default, an exception is thrown when a contract fails. This can be changed to do whatever you want. More on this later.

You can also see the contract for a function with the `functype` method:

    functype(:add)
    => "add :: Num, Num => Num"

This can be useful if you're in a REPL and want to figure out how a function should be used.

## Built-in Contracts

`Num` is one of the built-in contracts that contracts.ruby comes with. The built-in contracts are in the `Contracts` namespace. The easiest way to use them is to include the `Contracts::Builtin` module in your class/module.

contracts.ruby comes with a lot of built-in contracts, including the following:

* Basic types
  * [`Num`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Num) – checks that the argument is `Numeric`
  * [`Pos`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Pos) – checks that the argument is a positive number
  * [`Neg`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Neg) – checks that the argument is a negative number
  * [`Int`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Int) – checks that the argument is an integer
  * [`Nat`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Nat) – checks that the argument is a natural number (>= 0)
  * [`NatPos`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/NatPos) – checks that the argument is a positive natural number (> 0)
  * [`Bool`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Bool) – checks that the argument is `true` or `false`
  * [`Any`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Any) – Passes for any argument. Use when the argument has no constraints.
  * [`None`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/None) – Fails for any argument. Use when the method takes no arguments.

* Logical combinations
  * [`Maybe`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Maybe) – specifies that a value _may be_ nil, e.g. `Maybe[String]` (equivalent to `Or[String,nil]`)
  * [`Or`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Or) – passes if any of the given contracts pass, e.g. `Or[Integer, Float]`
  * [`Xor`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Xor) – passes if exactly one of the given contracts pass, e.g. `Xor[Integer, Float]`
  * [`And`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/And) – passes if all contracts pass, e.g. `And[Nat, -> (n) { n.even? }]`
  * [`Not`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Not) – passes if all contracts fail for the given argument, e.g. `Not[nil]`

* Collections
  * [`ArrayOf`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/ArrayOf) – checks that the argument is an array, and all elements pass the given contract, e.g. `ArrayOf[Num]`
  * [`SetOf`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/SetOf) – checks that the argument is a set, and all elements pass the given contract, e.g. `SetOf[Num]`
  * [`HashOf`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/HashOf) – checks that the argument is a hash, and all keys and values pass the given contract, e.g. `HashOf[Symbol => String]` or `HashOf[Symbol,String]`
  * [`StrictHash`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/StrictHash) – checks that the argument is a hash, and every key passed is present in the given contract, e.g. `StrictHash[{ :description => String, :number => Integer }]`
  * [`RangeOf`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/RangeOf) – checks that the argument is a range whose elements (#first and #last) pass the given contract, e.g. `RangeOf[Date]`
  * [`Enum`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Enum) – checks that the argument is part of a given collection of objects, e.g. `Enum[:a, :b, :c]`

* Keyword arguments
  * [`KeywordArgs`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/KeywordArgs) – checks that the argument is an options hash, and all required keyword arguments are present, and all values pass their respective contracts, e.g. `KeywordArgs[:number => Num, :description => Optional[String]]`
  * [`Optional`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Optional) – checks that the keyword argument is either not present or pass the given contract, can not be used outside of `KeywordArgs` contract, e.g. `Optional[Num]`

* Duck typing
  * [`RespondTo`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/RespondTo) – checks that the argument responds to all of the given methods, e.g. `RespondTo[:password, :credit_card]`
  * [`Send`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Send) – checks that all named methods return a truthy value, e.g. `Send[:valid?]`

* Miscellaneous
  * [`Exactly`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Exactly) – checks that the argument has the given type, not accepting sub-classes, e.g. `Exactly[Numeric]`.
  * [`Eq`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Eq) – checks that the argument is precisely equal to the given value, e.g. `Eq[String]` matches the class `String` and not a string instance.
  * [`Func`](http://www.rubydoc.info/gems/contracts/Contracts/Builtin/Func) – specifies the contract for a proc/lambda e.g. `Contract ArrayOf[Num], Func[Num => Num] => ArrayOf[Num]`. See section "Contracts On Functions".

To see all the built-in contracts and their full descriptions, check out the [RDoc](http://rubydoc.info/gems/contracts/Contracts/Builtin).

It is recommended to use shortcut for referring builtin contracts:

```ruby
# define shortcut somewhere at the top level of your codebase:
C = Contracts

# and use it:
Contract C::Maybe[C::Num], String => C::Num
```

Shortcut name should not be necessary `C`, can be anything that you are comfort
with while typing and anything that does not conflict with libraries you use.

All examples after this point assume you have chosen a shortcut as `C::`.

If you are sure, that builtin contracts will not nameclash with your own code
and libraries you may use, then you can include all builtin contracts in your
class/module:

```ruby
class Example
  include Contracts::Core
  include Contracts::Builtin

  Contract Maybe[Num], Or[Float, String] => Bool
  def complicated_algorithm(a, b)
    # ...
  end
end
```

## More Examples

### Hello, World

```ruby
Contract String => nil
def hello(name)
  puts "hello, #{name}!"
end
```

You always need to specify a contract for the return value. In this example, `hello` doesn't return anything, so the contract is `nil`. Now you know that you can use a constant like `nil` as the end of a contract. Valid values for a contract are:

- the name of a class (like `String` or `Integer`)
- a constant (like `nil` or `1`)
- a `Proc` that takes a value and returns true or false to indicate whether the contract passed or not
- a class that responds to the `valid?` class method (more on this later)
- an instance of a class that responds to the `valid?` method (more on this later)

### A Double Function

```ruby
Contract C::Or[Integer, Float] => C::Or[Integer, Float]
def double(x)
  2 * x
end
```

Sometimes you want to be able to choose between a few contracts. `Or` takes a variable number of contracts and checks the argument against all of them. If it passes for any of the contracts, then the `Or` contract passes.
This introduces some new syntax. One of the valid values for a contract is an instance of a class that responds to the `valid?` method. This is what `Or[Integer, Float]` is. The longer way to write it would have been:

```ruby
Contract C::Or.new(Integer, Float) => C::Or.new(Integer, Float)
```

All the built-in contracts have overridden the square brackets (`[]`) to give the same functionality. So you could write

```ruby
Contract C::Or[Integer, Float] => C::Or[Integer, Float]
```

or

```ruby
Contract C::Or.new(Integer, Float) => C::Or.new(Integer, Float)
```

whichever you prefer. They both mean the same thing here: make a new instance of `Or` with `Integer` and `Float`. Use that instance to validate the argument.

### A Product Function

```ruby
Contract C::ArrayOf[C::Num] => C::Num
def product(vals)
  total = 1
  vals.each do |val|
    total *= val
  end
  total
end
```

This contract uses the `ArrayOf` contract. Here's how `ArrayOf` works: it takes a contract. It expects the argument to be a list. Then it checks every value in that list to see if it satisfies that contract.

```ruby
# passes
product([1, 2, 3, 4])

# fails
product([1, 2, 3, "foo"])
```

### Another Product Function

```ruby
Contract C::Args[C::Num] => C::Num
def product(*vals)
  total = 1
  vals.each do |val|
    total *= val
  end
  total
end
```

This function uses varargs (`*args`) instead of an array. To make a contract on varargs, use the `Args` contract. It takes one contract as an argument and uses it to validate every element passed in through `*args`. So for example,

`Args[Num]` means they should all be numbers.

`Args[Or[Num, String]]` means they should all be numbers or strings.

`Args[Any]` means all arguments are allowed (`Any` is a contract that passes for any argument).

### Contracts On Arrays

If an array is one of the arguments and you know how many elements it's going to have, you can put a contract on it:

```ruby
# a function that takes an array of two elements...a person's age and a person's name.
Contract [C::Num, String] => nil
def person(data)
  p data
end
```

If you don't know how many elements it's going to have, use `ArrayOf`.

### Contracts On Hashes

Here's a contract that requires a Hash. We can put contracts on each of the keys:

```ruby
# note the parentheses around the hash; without those you would get a syntax error
Contract ({ :age => C::Num, :name => String }) => nil
def person(data)
  p data
end
```

Then if someone tries to call the function with bad data, it will fail:

```ruby
# error: age can't be nil!
person({:name => "Adit", :age => nil})
```

You don't need to put a contract on every key. So this call would succeed:

```ruby
person({:name => "Adit", :age => 42, :foo => "bar"})
```

even though we don't specify a type for `:foo`. If you need this check though, use `StrictHash` instead.

Peruse this contract on the keys and values of a Hash.

```ruby
Contract C::HashOf[Symbol, C::Num] => C::Num
def give_largest_value(hsh)
  hsh.values.max
end
```
Which you use like so:
```ruby
# succeeds
give_largest_value(a: 1, b: 2, c: 3) # returns 3

# fails
give_largest_value("a" => 1, 2 => 2, c: 3)
```

### Contracts On Strings

When you want a contract to match not just any string (i.e. `Contract String => nil`), you can use regular expressions:
```ruby
Contract /World|Mars/i => nil
def greet(name)
  puts "Hello #{name}!"
end
```

Using logical combinations you can combine existing definitions, instead of writing 1 big regular expression:
```ruby
Contract C::And[default_mail_regexp, /#{AppConfig.domain}\z/] => nil
def send_admin_invite(email)
```

### Contracts On Keyword Arguments

ruby 2.0+, but can be used for normal hashes too, when keyword arguments are
not available

Lets say you are writing a simple function and require a bunch of keyword arguments:

```ruby
def connect(host, port:, user:, password:)
```

You can of course put `Hash` contract on it:

```ruby
Contract String, { :port => C::Num, :user => String, :password => String } => Connection
def connect(host, port:, user:, password:)
```

But this will not quite work if you want to have a default values:

```ruby
Contract String, { :port => C::Num, :user => String, :password => String } => Connection
def connect(host, port: 5000, user:, password:)
  # ...
end

# No value is passed for port
connect("example.org", user: "me", password: "none")
```

Results in:

```
ContractError: Contract violation for argument 2 of 2:
        Expected: {:port=>Num, :user=>String, :password=>String},
        Actual: {:user=>"me", :password=>"none"}
        Value guarded in: Object::connect
        With Contract: String, Hash => Connection
        At: (irb):12
```

This can be fixed with contract `{ :port => C::Maybe[C::Num], ... }`, but that will
allow `nil` to be passed in, which is not the original intent.

So that is where `KeywordArgs` and `Optional` contracts jump in:

```ruby
Contract String, C::KeywordArgs[ :port => C::Optional[C::Num], :user => String, :password => String ] => Connection
def connect(host, port: 5000, user:, password:)
```

It looks just like the hash contract, but wrapped in `KeywordArgs` contract. Notice the usage of `Optional` contract - this way you specify that `:port` argument is optional. And it will not fail, when you omit this argument, but it will fail when you pass in `nil`.

### Contracts On Functions

Lets say you are writing a simple map function:

```ruby
def map(arr, func)
```

`map` takes an array, and a function. Suppose you want to add a contract to this function. You could try this:

```ruby
Contract C::ArrayOf[C::Any], Proc => C::ArrayOf[C::Any]
def map(arr, func)
```

This says that the second argument should be a `Proc`. You can call the function like so:

```ruby
p map([1, 2, 3], lambda { |x| x + 1 }) # works
```

But suppose you want to have a contract on the Proc too! Suppose you want to make sure that the Proc returns a number. Use the `Func` contract. `Func` takes a contract as its argument, and uses that contract on the function that you pass in.

Here's a `map` function that requires an array of numbers, and a function that takes a number and returns a number:

```ruby
Contract C::ArrayOf[C::Num], C::Func[C::Num => C::Num] => C::ArrayOf[C::Num]
def map(arr, func)
  ret = []
  arr.each do |x|
    ret << func[x]
  end
  ret
end
```

Earlier, we used `Proc`, which just says "make sure the second variable is a Proc". Now we are using `Func[Num => Num]`, which says "make sure the second variable is a Proc that takes a number and returns a number". Better!

Try this map function with these two examples:

```ruby
p map([1, 2, 3], lambda { |x| x + 1 }) # works
p map([1, 2, 3], lambda { |x| "oops" }) # fails, the lambda returns a string.
```

The above examples showed a method accepting a `Proc` as the last argument, but the same contract works on methods that accept a block:

```ruby
def map(arr, &block)
```

NOTE: This is not valid:

```ruby
Contract C::ArrayOf[C::Num], C::Func => C::ArrayOf[C::Num]
def map(arr, &func)
```

Here I am using `Func` without specifying a contract, like `Func[Num => Num]`. That's not a legal contract. If you just want to validate that the second argument is a proc, use `Proc`.

### Returning Multiple Values
Treat the return value as an array. For example, here's a function that returns two numbers:

```ruby
Contract C::Num => [C::Num, C::Num]
def mult(x)
  return x, x+1
end
```

## Synonyms For Contracts

If you use a contract a lot, it's a good idea to give it a meaningful synonym that tells the reader more about what your code returns. For example, suppose you have many functions that return a `Hash` or `nil`. If a `Hash` is returned, it contains information about a person. Your contact might look like this:

```ruby
Contract String => C::Or[Hash, nil]
def some_func(str)
```

You can make your contract more meaningful with a synonym:

```ruby
# the synonym
Person = Or[Hash, nil]

# use the synonym here
Contract String => Person
def some_func(str)
```

Now you can use `Person` wherever you would have used `Or[Hash, nil]`. Your code is now cleaner and more clearly says what the function is doing.

## Defining Your Own Contracts

Contracts are very easy to define. To re-iterate, there are 5 kinds of contracts:

- the name of a class (like `String` or `Integer`)
- a constant (like `nil` or `1`)
- a `Proc` that takes a value and returns true or false to indicate whether the contract passed or not
- a class that responds to the `valid?` class method (more on this later)
- an instance of a class that responds to the `valid?` method (more on this later)

The first two don't need any extra work to define: you can just use any constant or class name in your contract and it should just work. Here are examples for the rest:

### A Proc

```ruby
Contract lambda { |x| x.is_a? Numeric } => C::Num
def double(x)
```

The lambda takes one parameter: the argument that is getting passed to the function. It checks to see if it's a `Numeric`. If it is, it returns true. Otherwise it returns false.
It's not good practice to write a lambda right in your contract...if you find yourself doing it often, write it as a class instead:

### A Class With `valid?` As a Class Method

Here's how the `Num` class is defined. It does exactly what the `lambda` did in the previous example:

```ruby
class Num
  def self.valid? val
    val.is_a? Numeric
  end
end
```

The `valid?` class method takes one parameter: the argument that is getting passed to the function. It returns true or false.

### A Class With `valid?` As an Instance Method

Here's how the `Or` class is defined:

```ruby
class Or < CallableClass
  def initialize(*vals)
    @vals = vals
  end

  def valid?(val)
    @vals.any? do |contract|
      res, _ = Contract.valid?(val, contract)
      res
    end
  end
end
```

The `Or` contract takes a sequence of contracts, and passes if any of them pass. It uses `Contract.valid?` to validate the value against the contracts.

This class inherits from `CallableClass`, which allows us to use `[]` when using the class:

```ruby
Contract C::Or[Integer, Float] => C::Num
def double(x)
  2 * x
end
```

Without `CallableClass`, we would have to use `.new` instead:

```ruby
Contract C::Or.new(Integer, Float) => C::Num
def double(x)
# etc
```

You can use `CallableClass` in your own contracts to make them callable using `[]`.

## Customizing Error Messages

When a contract fails, part of the error message prints the contract:

    ...
    Expected: Contracts::Num,
    ...

You can customize this message by overriding the `to_s` method on your class or proc. For example, suppose we overrode `Num`'s `to_s` method:

```ruby
def Num.to_s
  "a number please"
end
```

Now the error says:

    ...
    Expected: a number please,
    ...

## Failure Callbacks

Supposing you don't want contract failures to become exceptions. You run a popular website, and when there's a contract exception you would rather log it and continue than throw an exception and break your site.

contracts.ruby provides a failure callback that gets called when a contract fails. For example, here we log every failure instead of raising an error:

```ruby
Contract.override_failure_callback do |data|
  puts "You had an error"
  puts failure_msg(data)
end
```

`failure_msg` is a function that prints out information about the failure. Your failure callback gets a hash with the following values:

    {
      :arg => the argument to the method,
      :contract => the contract that got violated,
      :class => the method's class,
      :method => the method,
      :contracts => the contract object
    }

If your failure callback returns `false`, the method that the contract is guarding will not be called (the default behaviour).

## Providing your own custom validators

This can be done with `Contract.override_validator`:

```ruby
# Make contracts accept all RSpec doubles
Contract.override_validator(:class) do |contract|
  lambda do |arg|
    arg.is_a?(RSpec::Mocks::Double) ||
      arg.is_a?(contract)
  end
end
```

The block you provide should always return lambda accepting one argument - validated argument. Block itself accepts contract as an argument.

Possible validator overrides:

- `override_validator(MyCustomContract)` - allows to add some special behaviour for custom contracts,
- `override_validator(Proc)` - e.g. `lambda { true }`,
- `override_validator(Array)` - e.g. `[C::Num, String]`,
- `override_validator(Hash)` - e.g. `{ :a => C::Num, :b => String }`,
- `override_validator(Range)` - e.g. `(1..10)`,
- `override_validator(Regexp)` - e.g. `/foo/`,
- `override_validator(Contracts::Args)` - e.g. `C::Args[C::Num]`,
- `override_validator(Contracts::Func)` - e.g. `C::Func[C::Num => C::Num]`,
- `override_validator(:valid)` - allows to override how contracts that respond to `:valid?` are handled,
- `override_validator(:class)` - allows to override how class/module contract constants are handled,
- `override_validator(:default)` - otherwise, raw value contracts.

Default validators can be found here: [lib/contracts/validators.rb](https://github.com/egonSchiele/contracts.ruby/blob/master/lib/contracts/validators.rb).

## Contracts with attributes

You can include the `Contracts::Attrs` module in your class/module to get access to attribute utilities:

- `attr_reader_with_contract <symbol>..., <contract>`
  - Wraps `attr_reader`, validates contract upon 'getting'
- `attr_writer_with_contract <symbol>..., <contract>`
  - Wraps `attr_writer`, validates contract upon 'setting'
- `attr_accessor_with_contract <symbol>..., <contract>`
  - Wraps `attr_accessor`, validates contract upon 'getting' or 'setting'

### Example

```ruby
class Person
  include Contracts::Core
  include Contracts::Attrs

  attr_accessor_with_contract :name, String
end

person = Person.new
person.name = 'Jane'
person.name = 1.4 # This results in a contract error!
```

## Disabling contracts

If you want to disable contracts, set the `NO_CONTRACTS` environment variable. This will disable contracts and you won't have a performance hit. Pattern matching will still work if you disable contracts in this way! With NO_CONTRACTS only pattern-matching contracts are defined.

## Method overloading

You can use contracts for method overloading! This is commonly called "pattern matching" in functional programming languages.

For example, here's a factorial function without method overloading:

```ruby
Contract C::Num => C::Num
def fact x
  if x == 1
    x
  else
    x * fact(x - 1)
  end
end
```

Here it is again, re-written with method overloading:

```ruby
Contract 1 => 1
def fact x
  x
end

Contract C::Num => C::Num
def fact x
  x * fact(x - 1)
end
```

For an argument, each function will be tried in order. The first function that doesn't raise a `ContractError` will be used. So in this case, if x == 1, the first function will be used. For all other values, the second function will be used.

This allows you write methods more declaratively, rather than using conditional branching. This feature is not only useful for recursion; you can use it to keep parallel use cases separate:

```ruby
Contract lambda{|n| n < 12 } => Ticket
def get_ticket(age)
  ChildTicket.new(age: age)
end

Contract lambda{|n| n >= 12 } => Ticket
def get_ticket(age)
  AdultTicket.new(age: age)
end

```

Note that the second `get_ticket` contract above could have been simplified to:

```ruby
Contract C::Num => Ticket
```

This is because the first contract eliminated the possibility of `age` being less than 12. However, the simpler contract is less explicit; you may want to "spell out" the age condition for clarity, especially if the method is overloaded with many contracts.

## Contracts in modules

Usage is the same as contracts in classes:

```ruby
module M
  include Contracts::Core

  Contract String => String
  def self.parse
    # do some hard parsing
  end
end
```

## Invariants

Invariants are conditions on objects that should always hold. If after any method call on given object, any of the Invariants fails, then Invariant violation error will be generated.

**NOTE**: Only methods with contracts will be affected.

A simple example:

```ruby
class MyBirthday < Struct.new(:day, :month)
  include Contracts::Core
  include Contracts::Invariants

  invariant(:day) { 1 <= day && day <= 31 }
  invariant(:month) { 1 <= month && month <= 12 }

  Contract C::None => Integer
  def silly_next_day!
    self.day += 1
  end
end

birthday = MyBirthday.new(31, 12)
birthday.silly_next_day!
```

If you run it, last line will generate invariant violation:

```ruby
./invariant.rb:38:in `failure_callback': Invariant violation: (RuntimeError)
   Expected: day condition to be true
   Actual: false
   Value guarded in: MyBirthday::silly_next_day!
   At: main.rb:9
```

Which means, that after `#silly_next_day!` all checks specified in `invariant` statement will be verified, and if at least one fail, then invariant violation error will be raised.

## Using contracts within your own code

contracts.ruby is obviously designed to check method parameters and return values. But if you want to check whether some other data obeys a contract, you can use `Contract.valid?(value, contract)`. For instance:

```ruby
data = parse(user_input)
unless Contract.valid?(data, HashOf[String,Nat])
  raise UserInputError.new(user_input)
end
```

## Auto-generate documentation using contracts

If you are generating documentation for your code with [YARD](http://yardoc.org/), check out [yard-contracts](https://github.com/sfcgeorge/yard-contracts). It will automatically annotate your functions with contracts information. Instead of documenting each parameter for a function yourself, you can just add a contract and yard-contracts will generate the documentation for you!

## Misc

Please submit any bugs [here](https://github.com/egonSchiele/contracts.ruby/issues) and I'll try to get them resolved ASAP!

See any mistakes in this tutorial? I try to make it bug-free, but they can creep in. [File an issue](https://github.com/egonSchiele/contracts.ruby/issues).

If you're using the library, please [let me know](https://github.com/egonSchiele) what project you're using it on :)

See the [wiki](https://github.com/egonSchiele/contracts.ruby/wiki) for more info.

Happy Coding!
