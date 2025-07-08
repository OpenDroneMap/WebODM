Feature: Or

  Takes a variable number of contracts. The contract passes if any of the
  contracts pass.

  ```ruby
  Contract C::Or[Float, C::Nat] => String
  ```

  This example will validate first argument of a method and accept either
  `Float` or natural integer.

  Background:
    Given a file named "or_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Or[Float, C::Nat] => String
      def nat_string(number)
        number.to_i.to_s
      end
    end
    """

  Scenario: Accepts float
    Given a file named "accepts_float.rb" with:
    """ruby
    require "./or_usage"
    puts Example.new.nat_string(3.7)
    """
    When I run `ruby accepts_float.rb`
    Then output should contain:
    """
    3
    """

  Scenario: Accepts natural
    Given a file named "accepts_natural.rb" with:
    """ruby
    require "./or_usage"
    puts Example.new.nat_string(7)
    """
    When I run `ruby accepts_natural.rb`
    Then output should contain:
    """
    7
    """

  Scenario: Rejects negative integer
    Given a file named "rejects_negative_integer.rb" with:
    """ruby
    require "./or_usage"
    puts Example.new.nat_string(-3)
    """
    When I run `ruby rejects_negative_integer.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float or Nat),
            Actual: -3
            Value guarded in: Example::nat_string
            With Contract: Or => String
    """

  Scenario: Rejects other values
    Given a file named "rejects_other.rb" with:
    """ruby
    require "./or_usage"
    puts Example.new.nat_string(nil)
    """
    When I run `ruby rejects_other.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float or Nat),
            Actual: nil
            Value guarded in: Example::nat_string
            With Contract: Or => String
    """
