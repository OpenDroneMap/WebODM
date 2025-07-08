Feature: Any

  Passes for any argument.

  ```ruby
  Contract C::Any => String
  ```

  Scenario: Accepts any argument
    Given a file named "any_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::Any => String
      def self.stringify(x)
        x.inspect
      end
    end

    puts Example.stringify(25)
    puts Example.stringify(37.59)
    puts Example.stringify("foo")
    puts Example.stringify(:foo)
    puts Example.stringify(nil)
    puts Example.stringify(Object)
    """
    When I run `ruby any_usage.rb`
    Then output should contain:
    """
    25
    37.59
    "foo"
    :foo
    nil
    Object
    """
    And output should not contain:
    """
    Contract violation for
    """
