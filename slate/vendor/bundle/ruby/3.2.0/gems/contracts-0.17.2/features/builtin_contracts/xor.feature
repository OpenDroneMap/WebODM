Feature: Xor

  Takes a variable number of contracts. The contract passes if one and only one
  of the contracts pass.

  ```ruby
  Contract C::Xor[Float, C::Neg] => String
  ```

  This example will validate first argument of a method and accept either
  `Float` or natural integer, but not both.

  Background:
    Given a file named "xor_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Xor[Float, C::Neg] => String
      def strange_number(number)
        number.to_i.to_s
      end
    end
    """

  Scenario: Accepts float
    Given a file named "accepts_float.rb" with:
    """ruby
    require "./xor_usage"
    puts Example.new.strange_number(3.7)
    """
    When I run `ruby accepts_float.rb`
    Then output should contain:
    """
    3
    """

  Scenario: Accepts negative integer
    Given a file named "accepts_negative_integer.rb" with:
    """ruby
    require "./xor_usage"
    puts Example.new.strange_number(-7)
    """
    When I run `ruby accepts_negative_integer.rb`
    Then output should contain:
    """
    -7
    """

  Scenario: Rejects negative float
    Given a file named "rejects_negative_float.rb" with:
    """ruby
    require "./xor_usage"
    puts Example.new.strange_number(-3.5)
    """
    When I run `ruby rejects_negative_float.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float xor Neg),
            Actual: -3.5
            Value guarded in: Example::strange_number
            With Contract: Xor => String
    """

  Scenario: Rejects positive integer
    Given a file named "rejects_positive_integer.rb" with:
    """ruby
    require "./xor_usage"
    puts Example.new.strange_number(9)
    """
    When I run `ruby rejects_positive_integer.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float xor Neg),
            Actual: 9
            Value guarded in: Example::strange_number
            With Contract: Xor => String
    """

  Scenario: Rejects other values
    Given a file named "rejects_other.rb" with:
    """ruby
    require "./xor_usage"
    puts Example.new.strange_number(:foo)
    """
    When I run `ruby rejects_other.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float xor Neg),
            Actual: :foo
            Value guarded in: Example::strange_number
            With Contract: Xor => String
    """
