Feature: NatPos

  Checks that an argument is a positive natural number.

  ```ruby
  Contract C::NatPos => C::NatPos
  ```

  Background:
    Given a file named "nat_pos_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class NaturalPositive
      include Contracts::Core

      Contract C::NatPos => C::NatPos
      def prev(number)
        number - 1
      end
    end
    """

  Scenario: Accepts positive integers
    Given a file named "accepts_positive_integers.rb" with:
    """ruby
    require "./nat_pos_usage"
    puts NaturalPositive.new.prev(7)
    """
    When I run `ruby accepts_positive_integers.rb`
    Then output should contain:
    """
    6
    """

  Scenario: Rejects zero
    Given a file named "rejects_zero.rb" with:
    """ruby
    require "./nat_pos_usage"
    puts NaturalPositive.new.prev(0)
    """
    When I run `ruby rejects_zero.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: NatPos,
            Actual: 0
            Value guarded in: NaturalPositive::prev
            With Contract: NatPos => NatPos
    """

  Scenario: Rejects negative integers
    Given a file named "rejects_negative_integers.rb" with:
    """ruby
    require "./nat_pos_usage"
    puts NaturalPositive.new.prev(-1)
    """
    When I run `ruby rejects_negative_integers.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: NatPos,
            Actual: -1
            Value guarded in: NaturalPositive::prev
            With Contract: NatPos => NatPos
    """
    And output should contain "nat_pos_usage.rb:8"

  Scenario: Rejects negative integers as a return value
    Given a file named "rejects_negative_integers.rb" with:
    """ruby
    require "./nat_pos_usage"
    puts NaturalPositive.new.prev(1)
    """
    When I run `ruby rejects_negative_integers.rb`
    Then output should contain:
    """
    : Contract violation for return value: (ReturnContractError)
            Expected: NatPos,
            Actual: 0
            Value guarded in: NaturalPositive::prev
            With Contract: NatPos => NatPos
    """
    And output should contain "nat_pos_usage.rb:8"

  Scenario: Rejects floats
    Given a file named "rejects_floats.rb" with:
    """ruby
    require "./nat_pos_usage"
    puts NaturalPositive.new.prev(3.43)
    """
    When I run `ruby rejects_floats.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: NatPos,
            Actual: 3.43
            Value guarded in: NaturalPositive::prev
            With Contract: NatPos => NatPos
    """
    And output should contain "nat_pos_usage.rb:8"

  Scenario: Rejects other values
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./nat_pos_usage"
    puts NaturalPositive.new.prev("foo")
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: NatPos,
            Actual: "foo"
            Value guarded in: NaturalPositive::prev
            With Contract: NatPos => NatPos
    """
    And output should contain "nat_pos_usage.rb:8"
