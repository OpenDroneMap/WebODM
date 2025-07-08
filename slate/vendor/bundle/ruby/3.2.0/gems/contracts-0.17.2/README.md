This project is looking for a new maintainer! [More details here](https://github.com/egonSchiele/contracts.ruby/issues/249)



# contracts.ruby [![GitHub Build Status](https://img.shields.io/github/actions/workflow/status/egonSchiele/contracts.ruby/tests.yaml?branch=master&style=flat-square)](https://github.com/egonSchiele/contracts.ruby/actions/workflows/tests.yaml) [![Join the chat at https://gitter.im/egonSchiele/contracts.ruby](https://img.shields.io/badge/gitter-join%20chat-brightgreen.svg)](https://gitter.im/egonSchiele/contracts.ruby)

Contracts let you clearly – even beautifully – express how your code behaves, and free you from writing tons of boilerplate, defensive code.

You can think of contracts as `assert` on steroids.

## 0.17.x = Ruby 3.x only

0.17.x only supports Ruby 3.x  
Looking for Ruby 2.x support?  
Use 0.16.x  

## Installation

    gem install contracts

## Hello World

A contract is one line of code that you write above a method definition. It validates the arguments to the method, and validates the return value of the method.

Here is a simple contract:

```ruby
  Contract Num => Num
  def double(x)
```

This says that double expects a number and returns a number. Here's the full code:

```ruby
require 'contracts'

class Example
  include Contracts::Core
  include Contracts::Builtin

  Contract Num => Num
  def double(x)
    x * 2
  end
end

puts Example.new.double("oops")
```

Save this in a file and run it. Notice we are calling `double` with `"oops"`, which is not a number. The contract fails with a detailed error message:

```
ParamContractError: Contract violation for argument 1 of 1:
        Expected: Num,
        Actual: "oops"
        Value guarded in: Example::double
        With Contract: Num => Num
        At: main.rb:8
        ...stack trace...
```

Instead of throwing an exception, you could log it, print a clean error message for your user...whatever you want. contracts.ruby is here to help you handle bugs better, not to get in your way.

## Tutorial

Check out [this awesome tutorial](https://egonschiele.github.io/contracts.ruby/).

## Use Cases

Check out [this screencast](https://vimeo.com/85883356).

## Development

To get started do the following:

1. Install required gems for development

  `bundle install`

2. Run our test suite

  `bundle exec rspec`
  
3. Run our code style checks
  
  `bundle exec rubocop`
  
## Performance

Using contracts.ruby results in very little slowdown. Check out [this blog post](http://adit.io/posts/2013-03-04-How-I-Made-My-Ruby-Project-10x-Faster.html#seconds-6) for more info.

**Q.** What Rubies can I use this with?

**A.** It's been tested with `3.0` and `3.1`. (In case this list becomes outdated see [`.github/workflows/tests.yaml`](/.github/workflows/tests.yaml))

If you're using the library, please [let me know](https://github.com/egonSchiele) what project you're using it on :)

## Testimonials

> Contracts literally saves us hours of pain at Snowplow every day

Alexander Dean, creator of [Snowplow](https://github.com/snowplow/snowplow)

> Contracts caught a bug that saved us several hundred dollars. It took less than 30 seconds to add the contract.

Michael Tomer

## Credits

Inspired by [contracts.coffee](http://disnet.github.io/contracts.coffee/).

Copyright 2012-2015 [Aditya Bhargava](http://adit.io).
Major improvements by [Alexey Fedorov](https://github.com/waterlink).

BSD Licensed.

