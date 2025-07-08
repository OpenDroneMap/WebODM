Feature: None

  Fails for any argument.

  Often used to explicitly specify that method does not accept any arguments:

  ```ruby
  Contract C::None => Symbol
  def a_symbol
    :a_symbol
  end
  ```

  The same behavior can be achieved when argument list omitted:

  ```ruby
  Contract Symbol
  def a_symbol
    :a_symbol
  end
  ```

  Background:
    Given a file named "helper.rb" with:
    """ruby
    def autorescue
      yield
    rescue => e
      # Since ruby 3.2 the `#inspect` output becomes a bit different
      puts e.inspect.gsub(/^#</, "").gsub(/Error:\"/, "Error: ")
    end
    """
    Given a file named "none_usage.rb" with:
    """ruby
    require "contracts"
    require "./helper"
    C = Contracts

    class Example
      include Contracts::Core

      Contract C::None => Symbol
      def self.a_symbol(*args)
        :a_symbol
      end

      Contract C::None => Symbol
      def a_symbol(*args)
        :a_symbol
      end
    end
    """

  Scenario: Accepts nothing
    Given a file named "nothing.rb" with:
    """ruby
    require "./none_usage"
    puts Example.a_symbol
    """
    When I run `ruby nothing.rb`
    Then output should contain:
    """
    a_symbol
    """

  Scenario: Rejects any argument
    Given a file named "anything.rb" with:
    """ruby
    require "./none_usage"
    autorescue { Example.new.a_symbol(nil) }
    autorescue { Example.new.a_symbol(12) }
    autorescue { Example.new.a_symbol(37.5) }
    autorescue { Example.new.a_symbol("foo") }
    autorescue { Example.new.a_symbol(:foo) }
    autorescue { Example.new.a_symbol({}) }
    autorescue { Example.new.a_symbol([]) }
    autorescue { Example.new.a_symbol(Object) }
    """
    When I run `ruby anything.rb`

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: nil
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: 12
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: 37.5
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: "foo"
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: :foo
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: {}
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: []
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """

    Then output should contain:
    """
    ParamContractError: Contract violation for argument 1 of 1:
            Expected: None,
            Actual: Object
            Value guarded in: Example::a_symbol
            With Contract: None => Symbol
    """
