Feature: Bool

  Checks that the argument is a `true` or `false`.

  ```ruby
  Contract String => C::Bool
  ```

  Background:
    Given a file named "bool_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract String => C::Bool
      def self.strong?(password)
        return if password == ""
        password.length > 22
      end
    end
    """

  Scenario: Accepts `true`
    Given a file named "true.rb" with:
    """ruby
    require "./bool_usage"
    puts Example.strong?("verystrongandLon774gPassword!ForYouHere")
    """
    When I run `ruby true.rb`
    Then output should contain:
    """
    true
    """

  Scenario: Accepts `false`
    Given a file named "false.rb" with:
    """ruby
    require "./bool_usage"
    puts Example.strong?("welcome")
    """
    When I run `ruby false.rb`
    Then output should contain:
    """
    false
    """

  Scenario: Rejects everything else
    Given a file named "nil.rb" with:
    """ruby
    require "./bool_usage"
    puts Example.strong?("")
    """
    When I run `ruby nil.rb`
    Then output should contain:
    """
    : Contract violation for return value: (ReturnContractError)
            Expected: Bool,
            Actual: nil
            Value guarded in: Example::strong?
            With Contract: String => Bool
    """
