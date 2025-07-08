Feature: Nat

  Checks that an argument is a natural number.

  ```ruby
  Contract C::Nat => C::Nat
  ```

  Background:
    Given a file named "nat_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Natural
      include Contracts::Core

      Contract C::Nat => C::Nat
      def prev(number)
        number - 1
      end
    end
    """

  Scenario: Accepts positive integers
    Given a file named "accepts_positive_integers.rb" with:
    """ruby
    require "./nat_usage"
    puts Natural.new.prev(7)
    """
    When I run `ruby accepts_positive_integers.rb`
    Then output should contain:
    """
    6
    """

  Scenario: Accepts zero
    Given a file named "accepts_zero.rb" with:
    """ruby
    require "./nat_usage"
    puts Natural.new.prev(1)
    """
    When I run `ruby accepts_zero.rb`
    Then output should contain:
    """
    0
    """

  Scenario: Rejects negative integers
    Given a file named "rejects_negative_integers.rb" with:
    """ruby
    require "./nat_usage"
    puts Natural.new.prev(-1)
    """
    When I run `ruby rejects_negative_integers.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Nat,
            Actual: -1
            Value guarded in: Natural::prev
            With Contract: Nat => Nat
    """
    And output should contain "nat_usage.rb:8"

  Scenario: Rejects negative integers as a return value
    Given a file named "rejects_negative_integers.rb" with:
    """ruby
    require "./nat_usage"
    puts Natural.new.prev(0)
    """
    When I run `ruby rejects_negative_integers.rb`
    Then output should contain:
    """
    : Contract violation for return value: (ReturnContractError)
            Expected: Nat,
            Actual: -1
            Value guarded in: Natural::prev
            With Contract: Nat => Nat
    """
    And output should contain "nat_usage.rb:8"

  Scenario: Rejects floats
    Given a file named "rejects_floats.rb" with:
    """ruby
    require "./nat_usage"
    puts Natural.new.prev(3.43)
    """
    When I run `ruby rejects_floats.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Nat,
            Actual: 3.43
            Value guarded in: Natural::prev
            With Contract: Nat => Nat
    """
    And output should contain "nat_usage.rb:8"

  Scenario: Rejects other values
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./nat_usage"
    puts Natural.new.prev("foo")
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Nat,
            Actual: "foo"
            Value guarded in: Natural::prev
            With Contract: Nat => Nat
    """
    And output should contain "nat_usage.rb:8"
