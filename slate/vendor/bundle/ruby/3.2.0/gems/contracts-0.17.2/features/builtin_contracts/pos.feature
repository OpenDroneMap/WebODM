Feature: Pos

  Checks that an argument is positive `Numeric`.

  ```ruby
  Contract C::Pos => C::Pos
  ```

  Background:
    Given a file named "pos_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Pos, C::Pos => C::Pos
      def power(number, power)
        return number if power <= 1
        number * self.power(number, power - 1)
      end
    end
    """

  Scenario: Accepts positive integers
    Given a file named "accepts_positive_integers.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.power(3, 4)
    """
    When I run `ruby accepts_positive_integers.rb`
    Then output should contain:
    """
    81
    """

  Scenario: Accepts positive floats
    Given a file named "accepts_positive_floats.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.power(3.7, 4.5)
    """
    When I run `ruby accepts_positive_floats.rb`
    Then output should contain:
    """
    693.4395
    """

  Scenario: Rejects negative integers
    Given a file named "rejects_negative_integers.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.power(3, -4)
    """
    When I run `ruby rejects_negative_integers.rb`
    Then output should contain:
    """
    : Contract violation for argument 2 of 2: (ParamContractError)
            Expected: Pos,
            Actual: -4
            Value guarded in: Example::power
            With Contract: Pos, Pos => Pos
    """
    And output should contain "pos_usage.rb:8"

  Scenario: Rejects negative floats
    Given a file named "rejects_negative_floats.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.power(3.7, -4.4)
    """
    When I run `ruby rejects_negative_floats.rb`
    Then output should contain:
    """
    : Contract violation for argument 2 of 2: (ParamContractError)
            Expected: Pos,
            Actual: -4.4
            Value guarded in: Example::power
            With Contract: Pos, Pos => Pos
    """
    And output should contain "pos_usage.rb:8"

  Scenario: Rejects zero
    Given a file named "rejects_zero.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.power(3, 0)
    """
    When I run `ruby rejects_zero.rb`
    Then output should contain:
    """
    : Contract violation for argument 2 of 2: (ParamContractError)
            Expected: Pos,
            Actual: 0
            Value guarded in: Example::power
            With Contract: Pos, Pos => Pos
    """
    And output should contain "pos_usage.rb:8"

  Scenario: Rejects other values
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./pos_usage"
    puts Example.new.power("foo", 2)
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 2: (ParamContractError)
            Expected: Pos,
            Actual: "foo"
            Value guarded in: Example::power
            With Contract: Pos, Pos => Pos
    """
    And output should contain "pos_usage.rb:8"
