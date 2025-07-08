Feature: Int

  Checks that an argument is an integer.

  ```ruby
  Contract C::Int => C::Int
  ```

  Background:
    Given a file named "int_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Integr
      include Contracts::Core

      Contract C::Int => C::Int
      def prev(number)
        number - 1
      end
    end
    """

  Scenario: Accepts positive integers
    Given a file named "accepts_positive_integers.rb" with:
    """ruby
    require "./int_usage"
    puts Integr.new.prev(7)
    """
    When I run `ruby accepts_positive_integers.rb`
    Then output should contain:
    """
    6
    """

  Scenario: Accepts zero
    Given a file named "accepts_zero.rb" with:
    """ruby
    require "./int_usage"
    puts Integr.new.prev(1)
    """
    When I run `ruby accepts_zero.rb`
    Then output should contain:
    """
    0
    """

  Scenario: Accepts negative integers
    Given a file named "accepts_negative_integers.rb" with:
    """ruby
    require "./int_usage"
    puts Integr.new.prev(-1)
    """
    When I run `ruby accepts_negative_integers.rb`
    Then output should contain:
    """
    -2
    """

  Scenario: Rejects floats
    Given a file named "rejects_floats.rb" with:
    """ruby
    require "./int_usage"
    puts Integr.new.prev(3.43)
    """
    When I run `ruby rejects_floats.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Int,
            Actual: 3.43
            Value guarded in: Integr::prev
            With Contract: Int => Int
    """
    And output should contain "int_usage.rb:8"

  Scenario: Rejects other values
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./int_usage"
    puts Integr.new.prev("foo")
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Int,
            Actual: "foo"
            Value guarded in: Integr::prev
            With Contract: Int => Int
    """
    And output should contain "int_usage.rb:8"
