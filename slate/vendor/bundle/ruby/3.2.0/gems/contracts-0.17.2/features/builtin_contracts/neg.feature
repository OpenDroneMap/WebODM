Feature: Neg

  Checks that an argument is negative `Numeric`.

  ```ruby
  Contract C::Neg => C::Neg
  ```

  Background:
    Given a file named "pos_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Neg => C::Neg
      def double_expense(amount)
        amount * 2
      end
    end
    """

  Scenario: Accepts negative integers
    Given a file named "accepts_negative_integers.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.double_expense(-50)
    """
    When I run `ruby accepts_negative_integers.rb`
    Then output should contain:
    """
    -100
    """

  Scenario: Accepts negative floats
    Given a file named "accepts_negative_floats.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.double_expense(-37.99)
    """
    When I run `ruby accepts_negative_floats.rb`
    Then output should contain:
    """
    -75.98
    """

  Scenario: Rejects positive integers
    Given a file named "rejects_positive_integers.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.double_expense(50)
    """
    When I run `ruby rejects_positive_integers.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Neg,
            Actual: 50
            Value guarded in: Example::double_expense
            With Contract: Neg => Neg
    """
    And output should contain "pos_usage.rb:8"

  Scenario: Rejects positive floats
    Given a file named "rejects_positive_floats.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.double_expense(42.50)
    """
    When I run `ruby rejects_positive_floats.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Neg,
            Actual: 42.5
            Value guarded in: Example::double_expense
            With Contract: Neg => Neg
    """
    And output should contain "pos_usage.rb:8"

  Scenario: Rejects zero
    Given a file named "rejects_zero.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.double_expense(0)
    """
    When I run `ruby rejects_zero.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Neg,
            Actual: 0
            Value guarded in: Example::double_expense
            With Contract: Neg => Neg
    """
    And output should contain "pos_usage.rb:8"

  Scenario: Rejects other values
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.double_expense("foo")
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Neg,
            Actual: "foo"
            Value guarded in: Example::double_expense
            With Contract: Neg => Neg
    """
    And output should contain "pos_usage.rb:8"
