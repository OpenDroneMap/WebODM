Feature: And

  Takes a variable number of contracts. The contract passes if all of the
  contracts pass.

  ```ruby
  Contract C::And[Float, C::Neg] => String
  ```

  This example will validate first argument of a method and accept only
  negative `Float`.

  Background:
    Given a file named "and_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::And[Float, C::Neg] => String
      def fneg_string(number)
        number.to_i.to_s
      end
    end
    """

  Scenario: Accepts negative float
    Given a file named "accepts_negative_float.rb" with:
    """ruby
    require "./and_usage"
    puts Example.new.fneg_string(-3.7)
    """
    When I run `ruby accepts_negative_float.rb`
    Then output should contain:
    """
    -3
    """

  Scenario: Rejects positive float
    Given a file named "rejects_positive_float.rb" with:
    """ruby
    require "./and_usage"
    puts Example.new.fneg_string(7.5)
    """
    When I run `ruby rejects_positive_float.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float and Neg),
            Actual: 7.5
            Value guarded in: Example::fneg_string
            With Contract: And => String
    """

  Scenario: Rejects negative integer
    Given a file named "rejects_negative_integer.rb" with:
    """ruby
    require "./and_usage"
    puts Example.new.fneg_string(-5)
    """
    When I run `ruby rejects_negative_integer.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float and Neg),
            Actual: -5
            Value guarded in: Example::fneg_string
            With Contract: And => String
    """

  Scenario: Rejects positive integer
    Given a file named "rejects_positive_integer.rb" with:
    """ruby
    require "./and_usage"
    puts Example.new.fneg_string(5)
    """
    When I run `ruby rejects_positive_integer.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float and Neg),
            Actual: 5
            Value guarded in: Example::fneg_string
            With Contract: And => String
    """

  Scenario: Rejects others
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./and_usage"
    puts Example.new.fneg_string(:foo)
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (Float and Neg),
            Actual: :foo
            Value guarded in: Example::fneg_string
            With Contract: And => String
    """
