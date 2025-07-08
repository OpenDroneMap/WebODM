Feature: Send

  Takes a variable number of method names as symbols. Given an argument, all of
  those methods are called on the argument one by one. If they all return true,
  the contract passes.

  ```ruby
  Contract C::Send[:valid?, :has_items?] => C::ArrayOf[Item]
  ```

  This contract will pass only if:
  `arg.valid? == true && arg.has_items? == true`,
  where `arg` is the first argument.

  Background:
    Given a file named "item.rb" with:
    """ruby
    Item = Struct.new(:name, :cost)
    Item::DEFAULT = Item["default", 0]
    """

    Given a file named "send_usage.rb" with:
    """ruby
    require "contracts"
    C = Contracts
    require "./item"

    class FetchItemCommand
      include Contracts::Core

      Contract C::Send[:valid?, :has_items?] => C::ArrayOf[Item]
      def call(subject)
        ([Item::DEFAULT] + subject.items).uniq
      end
    end
    """

  Scenario: All methods return `true`
    Given a file named "box.rb" with:
    """ruby
    class Box
      def valid?
        true
      end

      def has_items?
        true
      end

      def items
        [Item["cat", 599.99]]
      end
    end

    require "./send_usage"
    p FetchItemCommand.new.call(Box.new)
    """
    When I run `ruby box.rb`
    Then output should contain:
    """
    [#<struct Item name="default", cost=0>, #<struct Item name="cat", cost=599.99>]
    """

  Scenario: When second method returns `false`
    Given a file named "cat.rb" with:
    """ruby
    class Cat
      def valid?
        true
      end

      def has_items?
        false
      end
    end

    require "./send_usage"
    p FetchItemCommand.new.call(Cat.new)
    """
    When I run `ruby cat.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (a value that returns true for all of [:valid?, :has_items?]),
    """
    And output should contain:
    """
    Actual: #<Cat
    """

  Scenario: When first method returns `false`
    Given a file named "invalid.rb" with:
    """ruby
    class Invalid
      def valid?
        false
      end

      def has_items?
        true
      end

      def items
        []
      end
    end

    require "./send_usage"
    p FetchItemCommand.new.call(Invalid.new)
    """
    When I run `ruby invalid.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (a value that returns true for all of [:valid?, :has_items?]),
    """
    And output should contain:
    """
    Actual: #<Invalid
    """

  Scenario: When all methods return `false`
    Given a file named "nothing.rb" with:
    """ruby
    class Nothing
      def valid?
        false
      end

      def has_items?
        false
      end
    end

    require "./send_usage"
    p FetchItemCommand.new.call(Nothing.new)
    """
    When I run `ruby nothing.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (a value that returns true for all of [:valid?, :has_items?]),
    """
    And output should contain:
    """
    Actual: #<Nothing
    """
