Feature: Method Overloading

  You can use contracts for method overloading! This is commonly called "pattern matching" in functional programming languages.

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

  Background:
    Given a file named "method_overloading_with_positional_args_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract 1 => 1
      def fact(x)
        x
      end

      Contract C::Num => C::Num
      def fact(x)
        x * fact(x - 1)
      end
    end
    """

    Given a file named "method_overloading_with_keyword_args_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::KeywordArgs[age: Integer, size: Symbol] => String
      def speak(age:, size:)
        "age: #{age} size: #{size}"
      end

      Contract C::KeywordArgs[sound: String] => String
      def speak(sound:)
        "sound: #{sound}"
      end
    end
    """

  Scenario: Positional Args Method 1
    Given a file named "positional_args_method_1.rb" with:
    """ruby
    require "./method_overloading_with_positional_args_usage"
    puts Example.new.fact(1)
    """
    When I run `ruby positional_args_method_1.rb`
    Then the output should contain:
    """
    1
    """

  Scenario: Positional Args Method 2
    Given a file named "positional_args_method_2.rb" with:
    """ruby
    require "./method_overloading_with_positional_args_usage"
    puts Example.new.fact(4)
    """
    When I run `ruby positional_args_method_2.rb`
    Then the output should contain:
    """
    24
    """

  Scenario: Keyword Args Method 1
    Given a file named "keyword_args_method_1.rb" with:
    """ruby
    require "./method_overloading_with_keyword_args_usage"
    puts Example.new.speak(age: 5, size: :large)
    """
    When I run `ruby keyword_args_method_1.rb`
    Then the output should contain:
    """
    age: 5 size: large
    """

  Scenario: Keyword Args Method 2
    Given a file named "keyword_args_method_2.rb" with:
    """ruby
    require "./method_overloading_with_keyword_args_usage"
    puts Example.new.speak(sound: "woof")
    """
    When I run `ruby keyword_args_method_2.rb`
    Then the output should contain:
    """
    sound: woof
    """

  Scenario: Incorrect Positional Args Method
    Given a file named "incorrect_positional_args_method.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      # Notice that this method's contract is wider than the one below
      # This would cause this method to be called every time but never the one below
      Contract C::Num => C::Num
      def fact(x)
        x * fact(x - 1)
      end

      Contract 1 => 1
      def fact(x)
        x
      end
    end
    puts Example.new.fact(4)
    """
    When I run `ruby incorrect_positional_args_method.rb`
    Then the output should contain:
    """
    stack level too deep (SystemStackError)
    """
