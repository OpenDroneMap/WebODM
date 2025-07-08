Feature: Args

  Used for `*args` (variadic functions). Takes contract and uses it to validate
  every element passed in through `*args`.

  ```ruby
  Contract C::Args[C::Num] => C::Bool
  def example(*args)
  ```

  This example contract will validate all arguments passed through `*args` to
  accept only numbers.

  Background:
    Given a file named "args_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Args[C::Num] => C::Bool
      def only_nums(*args)
        args.inspect
      end
    end
    """

  Scenario: Accepts no arguments
    Given a file named "accepts_no_arguments.rb" with:
    """ruby
    require "./args_usage"
    puts Example.new.only_nums
    """
    When I run `ruby accepts_no_arguments.rb`
    Then the output should contain:
    """
    []
    """

  Scenario: Accepts one valid argument
    Given a file named "accepts_one_argument.rb" with:
    """ruby
    require "./args_usage"
    puts Example.new.only_nums(42)
    """
    When I run `ruby accepts_one_argument.rb`
    Then the output should contain:
    """
    [42]
    """

  Scenario: Accepts many valid arguments
    Given a file named "accepts_many_arguments.rb" with:
    """ruby
    require "./args_usage"
    puts Example.new.only_nums(42, 45, 17, 24)
    """
    When I run `ruby accepts_many_arguments.rb`
    Then the output should contain:
    """
    [42, 45, 17, 24]
    """

  Scenario: Rejects invalid argument
    Given a file named "rejects_invalid_argument.rb" with:
    """ruby
    require "./args_usage"
    puts Example.new.only_nums(42, "foo", 17, 24)
    """
    When I run `ruby rejects_invalid_argument.rb`
    Then the output should contain:
    """
    : Contract violation for argument 1 of 4: (ParamContractError)
            Expected: (Args[Contracts::Builtin::Num]),
            Actual: "foo"
            Value guarded in: Example::only_nums
            With Contract: Args => Bool
    """
