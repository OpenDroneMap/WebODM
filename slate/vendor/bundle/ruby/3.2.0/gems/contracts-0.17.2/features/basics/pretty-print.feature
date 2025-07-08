Feature: Pretty printing Contract violations

  Scenario: Big array argument being passed to big array method parameter
    Given a file named "example.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      class << self
        Contract [
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol]
        ] => nil
        def run(data)
          nil
        end
      end
    end

    puts Example.run([
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"],
      ["foo", "foo"]
    ])
    """
    When I run `ruby example.rb`
    Then the output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: [(String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol)],
            Actual: [["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"]]
            Value guarded in: Example::run
            With Contract: Array => NilClass
            At: example.rb:17
    """

  Scenario: Big array value being returned from method expecting different big array type
    Given a file named "example.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      class << self
        Contract C::None => [
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol],
            C::Or[String, Symbol]
        ]
        def run
          [
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"],
            ["foo", "foo"]
          ]
        end
      end
    end

    puts Example.run
    """
    When I run `ruby example.rb`
    Then the output should contain:
    """
    : Contract violation for return value: (ReturnContractError)
            Expected: [(String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol),
                       (String or Symbol)],
            Actual: [["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"],
                     ["foo", "foo"]]
            Value guarded in: Example::run
            With Contract: None => Array
            At: example.rb:17
    """

  Scenario: Big hash argument being passed to big hash method parameter
    Given a file named "example.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      class << self
        Contract ({
            a: C::Or[String, Symbol],
            b: C::Or[String, Symbol],
            c: C::Or[String, Symbol],
            d: C::Or[String, Symbol],
            e: C::Or[String, Symbol],
            f: C::Or[String, Symbol],
            g: C::Or[String, Symbol]
        }) => nil
        def run(data)
          nil
        end
      end
    end

    puts Example.run({
      a: ["foo", "foo"],
      b: ["foo", "foo"],
      c: ["foo", "foo"],
      d: ["foo", "foo"],
      e: ["foo", "foo"],
      f: ["foo", "foo"],
      g: ["foo", "foo"]
    })
    """
    When I run `ruby example.rb`
    Then the output should contain:
    """
    : Contract violation for argument 1 of 1: (ParamContractError)
            Expected: {:a=>(String or Symbol),
                       :b=>(String or Symbol),
                       :c=>(String or Symbol),
                       :d=>(String or Symbol),
                       :e=>(String or Symbol),
                       :f=>(String or Symbol),
                       :g=>(String or Symbol)},
            Actual: {:a=>["foo", "foo"],
                     :b=>["foo", "foo"],
                     :c=>["foo", "foo"],
                     :d=>["foo", "foo"],
                     :e=>["foo", "foo"],
                     :f=>["foo", "foo"],
                     :g=>["foo", "foo"]}
            Value guarded in: Example::run
            With Contract: Hash => NilClass
            At: example.rb:17
    """

  Scenario: Big hash value being returned from method expecting different big hash type
    Given a file named "example.rb" with:
    """ruby
    require "contracts"
    C = Contracts

    class Example
      include Contracts::Core

      class << self
        Contract C::None => ({
            a: C::Or[String, Symbol],
            b: C::Or[String, Symbol],
            c: C::Or[String, Symbol],
            d: C::Or[String, Symbol],
            e: C::Or[String, Symbol],
            f: C::Or[String, Symbol],
            g: C::Or[String, Symbol]
        })
        def run
          {
            a: ["foo", "foo"],
            b: ["foo", "foo"],
            c: ["foo", "foo"],
            d: ["foo", "foo"],
            e: ["foo", "foo"],
            f: ["foo", "foo"],
            g: ["foo", "foo"]
          }
        end
      end
    end

    puts Example.run
    """
    When I run `ruby example.rb`
    Then the output should contain:
    """
    : Contract violation for return value: (ReturnContractError)
            Expected: {:a=>(String or Symbol),
                       :b=>(String or Symbol),
                       :c=>(String or Symbol),
                       :d=>(String or Symbol),
                       :e=>(String or Symbol),
                       :f=>(String or Symbol),
                       :g=>(String or Symbol)},
            Actual: {:a=>["foo", "foo"],
                     :b=>["foo", "foo"],
                     :c=>["foo", "foo"],
                     :d=>["foo", "foo"],
                     :e=>["foo", "foo"],
                     :f=>["foo", "foo"],
                     :g=>["foo", "foo"]}
            Value guarded in: Example::run
            With Contract: None => Hash
            At: example.rb:17
    """
