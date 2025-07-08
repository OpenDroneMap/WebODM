Feature: Num

  Checks that an argument is `Numeric`.

  ```ruby
  Contract C::Num => C::Num
  ```

  Background:
    Given a file named "num_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Num => C::Num
      def increase(number)
        number + 1
      end
    end
    """

  Scenario: Accepts integers
    Given a file named "accepts_integers.rb" with:
    """ruby
    require "./num_usage"
    puts Example.new.increase(7)
    """
    When I run `ruby accepts_integers.rb`
    Then output should contain:
    """
    8
    """

  Scenario: Accepts floats
    Given a file named "accepts_floats.rb" with:
    """ruby
    require "./num_usage"
    puts Example.new.increase(7.5)
    """
    When I run `ruby accepts_floats.rb`
    Then output should contain:
    """
    8.5
    """

  Scenario: Rejects other values
    Given a file named "rejects_others.rb" with:
    """ruby
    require "./num_usage"
    puts Example.new.increase("foo")
    """
    When I run `ruby rejects_others.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: Num,
            Actual: "foo"
            Value guarded in: Example::increase
            With Contract: Num => Num
    """
    And output should contain "num_usage.rb:8"
