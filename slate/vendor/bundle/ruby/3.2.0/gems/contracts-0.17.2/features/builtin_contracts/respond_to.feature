Feature: RespondTo

  Takes a variable number of method names as symbols. The contract passes if
  the argument responds to all of those methods.

  ```ruby
  Contract C::RespondTo[:email, :password, :confirmation] => C::Bool
  ```

  This contract will pass only for objects that `respond_to?` `:email`,
  `:password` and `:confirmation`.

  Background:
    Given a file named "signup_validator.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class SignupValidator
      include Contracts::Core

      Contract C::RespondTo[:email, :password, :confirmation] => C::Bool
      def valid?(signup)
        !!signup.email.match("@") &&
          signup.password.length > 6 &&
          signup.password == signup.confirmation
      end
    end
    """

    Given a file named "signup.rb" with:
    """ruby
    Signup = Struct.new(:email, :password, :confirmation)
    """

    Given a file named "signin.rb" with:
    """ruby
    Signin = Struct.new(:email, :password)
    """

    Given a file named "helper.rb" with:
    """ruby
    require "./signup_validator"
    require "./signup"
    require "./signin"
    """

  Scenario: Accepts correct object
    Given a file named "correct.rb" with:
    """ruby
    require "./helper"

    puts SignupValidator.new.valid?(Signup["john@example.org", "welcome", "welcome"])
    puts SignupValidator.new.valid?(Signup["john@example.org", "welcome", "welcomr"])
    """
    When I run `ruby correct.rb`
    Then output should contain:
    """
    true
    false
    """

  Scenario: Rejects incorrect object
    Given a file named "incorrect.rb" with:
    """ruby
    require "./helper"

    puts SignupValidator.new.valid?(Signin["john@example.org", "welcome"])
    """
    When I run `ruby incorrect.rb`
    Then output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: (a value that responds to [:email, :password, :confirmation]),
            Actual: #<struct Signin email="john@example.org", password="welcome">
            Value guarded in: SignupValidator::valid?
            With Contract: RespondTo => Bool
    """
