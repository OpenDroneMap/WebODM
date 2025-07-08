Feature: Fetching contracted function type

  You can use `functype(name)` method for that:

  ```ruby
  functype(:add) # => "add :: Num, Num => Num"
  ```

  Background:
    Given a file named "example.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Num, C::Num => C::Num
      def add(a, b)
        a + b
      end

      Contract String => String
      def self.greeting(name)
        "Hello, #{name}"
      end

      class << self
        Contract C::Num => C::Num
        def increment(number)
          number + 1
        end
      end
    end
    """

  Scenario: functype on instance method
    Given a file named "instance_method_functype.rb" with:
    """ruby
    require "./example"
    puts Example.new.functype(:add)
    """
    When I run `ruby instance_method_functype.rb`
    Then the output should contain:
    """
    add :: Num, Num => Num
    """

  Scenario: functype on class method
    Given a file named "class_method_functype.rb" with:
    """ruby
    require "./example"
    puts Example.functype(:greeting)
    """
    When I run `ruby class_method_functype.rb`
    Then the output should contain:
    """
    greeting :: String => String
    """

  Scenario: functype on singleton method
    Given a file named "singleton_method_functype.rb" with:
    """ruby
    require "./example"
    puts Example.functype(:increment)
    """
    When I run `ruby singleton_method_functype.rb`
    Then the output should contain:
    """
    increment :: Num => Num
    """
