Feature: KeywordArgs when used with optional positional arguments

  Checks that the argument is an options hash, and all required keyword arguments are present, and all values pass their respective contracts

  ```ruby
  Contract Any, KeywordArgs[:number => Num, :description => Optional[String]] => Any
  ```

  Background:
    Given a file named "keyword_args_with_optional_positional_args_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Any, String, C::KeywordArgs[b: C::Optional[String]] => Symbol
      def foo(output, a = 'a', b: 'b')
        p [a, b]
        output
      end
    end
    """

  Scenario: Accepts arguments when only require arguments filled and valid
    Given a file named "accepts_all_filled_valid_args.rb" with:
    """ruby
    require "./keyword_args_with_optional_positional_args_usage"
    puts Example.new.foo(:output)
    """
    When I run `ruby accepts_all_filled_valid_args.rb`
    Then output should contain:
    """
    ["a", "b"]
    output
    """

  Scenario: Accepts arguments when all filled and valid
    Given a file named "accepts_all_filled_valid_args.rb" with:
    """ruby
    require "./keyword_args_with_optional_positional_args_usage"
    puts Example.new.foo(:output, 'c', b: 'd')
    """
    When I run `ruby accepts_all_filled_valid_args.rb`
    Then output should contain:
    """
    ["c", "d"]
    output
    """

  Scenario: Accepts arguments when only require arguments & optional keyword arguments filled and valid
    Given a file named "accepts_all_filled_valid_args.rb" with:
    """ruby
    require "./keyword_args_with_optional_positional_args_usage"
    puts Example.new.foo(:output, b: 'd')
    """
    When I run `ruby accepts_all_filled_valid_args.rb`
    Then output should contain:
    """
    ["a", "d"]
    output
    """

  Scenario: Accepts arguments when only require arguments & optional positional arguments filled and valid
    Given a file named "accepts_all_filled_valid_args.rb" with:
    """ruby
    require "./keyword_args_with_optional_positional_args_usage"
    puts Example.new.foo(:output, 'c')
    """
    When I run `ruby accepts_all_filled_valid_args.rb`
    Then output should contain:
    """
    ["c", "b"]
    output
    """
