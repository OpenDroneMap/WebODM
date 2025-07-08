RSpec.describe "Contracts:" do
  before :all do
    @o = GenericExample.new
  end

  describe "basic" do
    it "should fail for insufficient arguments" do
      expect do
        @o.hello
      end.to raise_error ArgumentError
    end

    it "should fail for insufficient contracts" do
      expect { @o.bad_double(2) }.to raise_error(ContractError)
    end
  end

  describe "contracts for functions with no arguments" do
    it "should work for functions with no args" do
      expect { @o.no_args }.to_not raise_error
    end

    it "should still work for old-style contracts for functions with no args" do
      expect { @o.old_style_no_args }.to_not raise_error
    end

    it "should not work for a function with a bad contract" do
      expect do
        Class.new(GenericExample) do
          Contract Num, Num
          def no_args_bad_contract
            1
          end
        end
      end.to raise_error NameError
    end
  end

  describe "pattern matching" do
    let(:string_with_hello) { "Hello, world" }
    let(:string_without_hello) { "Hi, world" }
    let(:expected_decorated_string) { "Hello, world!" }
    subject { PatternMatchingExample.new }

    it "should work as expected when there is no contract violation" do
      expect(
        subject.process_request(PatternMatchingExample::Success.new(string_with_hello))
      ).to eq(PatternMatchingExample::Success.new(expected_decorated_string))

      expect(
        subject.process_request(PatternMatchingExample::Failure.new)
      ).to be_a(PatternMatchingExample::Failure)
    end

    it "should not fall through to next pattern when there is a deep contract violation" do
      expect(PatternMatchingExample::Failure).not_to receive(:is_a?)
      expect do
        subject.process_request(PatternMatchingExample::Success.new(string_without_hello))
      end.to raise_error(ContractError)
    end

    it "should fail when the pattern-matched method's contract fails" do
      expect do
        subject.process_request("bad input")
      end.to raise_error(ContractError)
    end

    it "should work for differing arities" do
      expect(
        subject.do_stuff(1, "abc", 2)
      ).to eq("bar")

      expect(
        subject.do_stuff(3, "def")
      ).to eq("foo")
    end

    it "if the return contract for a pattern match fails, it should fail instead of trying the next pattern match" do
      expect do
        subject.double(1)
      end.to raise_error(ContractError)
    end

    it "should fail if multiple methods are defined with the same contract (for pattern-matching)" do
      expect do
        Class.new(GenericExample) do
          Contract Contracts::Num => Contracts::Num
          def same_param_contract x
            x + 2
          end

          Contract Contracts::Num => String
          def same_param_contract x
            "sdf"
          end
        end
      end.to raise_error(ContractError)
    end

    context "when failure_callback was overriden" do
      before do
        ::Contract.override_failure_callback do |_data|
          fail "contract violation"
        end
      end

      it "calls a method when first pattern matches" do
        expect(
          subject.process_request(PatternMatchingExample::Success.new(string_with_hello))
        ).to eq(PatternMatchingExample::Success.new(expected_decorated_string))
      end

      it "falls through to 2nd pattern when first pattern does not match" do
        expect(
          subject.process_request(PatternMatchingExample::Failure.new)
        ).to be_a(PatternMatchingExample::Failure)
      end

      it "if the return contract for a pattern match fails, it should fail instead of trying the next pattern match, even with the failure callback" do
        expect do
          subject.double(1)
        end.to raise_error(ContractError)
      end

      it "uses overriden failure_callback when pattern matching fails" do
        expect do
          subject.process_request("hello")
        end.to raise_error(RuntimeError, /contract violation/)
      end
    end
  end

  describe "usage in singleton class" do
    it "should work normally when there is no contract violation" do
      expect(SingletonClassExample.hoge("hoge")).to eq("superhoge")
    end

    it "should fail with proper error when there is contract violation" do
      expect do
        SingletonClassExample.hoge(3)
      end.to raise_error(ContractError, /Expected: String/)
    end

    describe "builtin contracts usage" do
      it "allows to use builtin contracts without namespacing and redundant Contracts inclusion" do
        expect do
          SingletonClassExample.add("55", 5.6)
        end.to raise_error(ContractError, /Expected: Num/)
      end
    end
  end

  describe "usage in the singleton class of a subclass" do
    subject { SingletonInheritanceExampleSubclass }

    it "should work with a valid contract on a singleton method" do
      expect(subject.num(1)).to eq(1)
    end
  end

  describe "no contracts feature" do
    it "disables normal contract checks" do
      object = NoContractsSimpleExample.new
      expect { object.some_method(3) }.not_to raise_error
    end

    it "disables invariants" do
      object = NoContractsInvariantsExample.new
      object.day = 7
      expect { object.next_day }.not_to raise_error
    end

    it "does not disable pattern matching" do
      object = NoContractsPatternMatchingExample.new

      expect(object.on_response(200, "hello")).to eq("hello!")
      expect(object.on_response(404, "Not found")).to eq("error 404: Not found")
      expect { object.on_response(nil, "junk response") }.to raise_error(ContractError)
    end
  end

  describe "module usage" do
    context "with instance methods" do
      it "should check contract" do
        expect { KlassWithModuleExample.new.plus(3, nil) }.to raise_error(ContractError)
      end
    end

    context "with singleton methods" do
      it "should check contract" do
        expect { ModuleExample.hoge(nil) }.to raise_error(ContractError)
      end
    end

    context "with singleton class methods" do
      it "should check contract" do
        expect { ModuleExample.eat(:food) }.to raise_error(ContractError)
      end
    end
  end

  describe "singleton methods self in inherited methods" do
    it "should be a proper self" do
      expect(SingletonInheritanceExampleSubclass.a_contracted_self).to eq(SingletonInheritanceExampleSubclass)
    end
  end

  describe "anonymous classes" do
    let(:klass) do
      Class.new do
        include Contracts::Core

        Contract String => String
        def greeting(name)
          "hello, #{name}"
        end
      end
    end

    let(:obj) { klass.new }

    it "does not fail when contract is satisfied" do
      expect(obj.greeting("world")).to eq("hello, world")
    end

    it "fails with error when contract is violated" do
      expect { obj.greeting(3) }.to raise_error(ContractError, /Actual: 3/)
    end
  end

  describe "anonymous modules" do
    let(:mod) do
      Module.new do
        include Contracts::Core

        Contract String => String
        def greeting(name)
          "hello, #{name}"
        end

        Contract String => String
        def self.greeting(name)
          "hello, #{name}"
        end
      end
    end

    let(:klass) do
      Class.new.tap { |klass| klass.send(:include, mod) }
    end

    let(:obj) { klass.new }

    it "does not fail when contract is satisfied" do
      expect(obj.greeting("world")).to eq("hello, world")
    end

    it "fails with error when contract is violated" do
      expect { obj.greeting(3) }.to raise_error(ContractError, /Actual: 3/)
    end

    context "when called on module itself" do
      let(:obj) { mod }

      it "does not fail when contract is satisfied" do
        expect(obj.greeting("world")).to eq("hello, world")
      end

      it "fails with error when contract is violated" do
        expect { obj.greeting(3) }.to raise_error(ContractError, /Actual: 3/)
      end
    end
  end

  describe "instance methods" do
    it "should allow two classes to have the same method with different contracts" do
      a = A.new
      b = B.new
      expect do
        a.triple(5)
        b.triple("a string")
      end.to_not raise_error
    end
  end

  describe "instance and class methods" do
    it "should allow a class to have an instance method and a class method with the same name" do
      a = A.new
      expect do
        a.instance_and_class_method(5)
        A.instance_and_class_method("a string")
      end.to_not raise_error
    end
  end

  describe "class methods" do
    it "should pass for correct input" do
      expect { GenericExample.a_class_method(2) }.to_not raise_error
    end

    it "should fail for incorrect input" do
      expect { GenericExample.a_class_method("bad") }.to raise_error(ContractError)
    end
  end

  describe "classes" do
    it "should pass for correct input" do
      expect { @o.hello("calvin") }.to_not raise_error
    end

    it "should fail for incorrect input" do
      expect { @o.hello(1) }.to raise_error(ContractError)
    end
  end

  describe "classes with a valid? class method" do
    it "should pass for correct input" do
      expect { @o.double(2) }.to_not raise_error
    end

    it "should fail for incorrect input" do
      expect { @o.double("bad") }.to raise_error(ContractError)
    end
  end

  describe "Procs" do
    it "should pass for correct input" do
      expect { @o.square(2) }.to_not raise_error
    end

    it "should fail for incorrect input" do
      expect { @o.square("bad") }.to raise_error(ContractError)
    end
  end

  describe "Arrays" do
    it "should pass for correct input" do
      expect { @o.sum_three([1, 2, 3]) }.to_not raise_error
    end

    it "should fail for insufficient items" do
      expect { @o.square([1, 2]) }.to raise_error(ContractError)
    end

    it "should fail for some incorrect elements" do
      expect { @o.sum_three([1, 2, "three"]) }.to raise_error(ContractError)
    end
  end

  describe "Hashes" do
    it "should pass for exact correct input" do
      expect { @o.person({ :name => "calvin", :age => 10 }) }.to_not raise_error
    end

    it "should pass even if some keys don't have contracts" do
      expect { @o.person({ :name => "calvin", :age => 10, :foo => "bar" }) }.to_not raise_error
    end

    it "should fail if a key with a contract on it isn't provided" do
      expect { @o.person({ :name => "calvin" }) }.to raise_error(ContractError)
    end

    it "should fail for incorrect input" do
      expect { @o.person({ :name => 50, :age => 10 }) }.to raise_error(ContractError)
    end
  end

  describe "blocks" do
    it "should pass for correct input" do
      expect do
        @o.do_call do
          2 + 2
        end
      end.to_not raise_error
    end

    it "should fail for incorrect input" do
      expect do
        @o.do_call(nil)
      end.to raise_error(ContractError)
    end

    it "should handle properly lack of block when there are other arguments" do
      expect do
        @o.double_with_proc(4)
      end.to raise_error(ContractError, /Actual: nil/)
    end

    it "should succeed for maybe proc with no proc" do
      expect do
        @o.maybe_call(5)
      end.to_not raise_error
    end

    it "should succeed for maybe proc with proc" do
      expect do
        @o.maybe_call(5) do
          2 + 2
        end
      end.to_not raise_error
    end

    it "should fail for maybe proc with invalid input" do
      expect do
        @o.maybe_call("bad")
      end.to raise_error(ContractError)
    end

    describe "varargs are given with a maybe block" do
      it "when a block is passed in, varargs should be correct" do
        expect(@o.maybe_call(1, 2, 3) { 1 + 1 }).to eq([1, 2, 3])
      end

      it "when a block is NOT passed in, varargs should still be correct" do
        expect(@o.maybe_call(1, 2, 3)).to eq([1, 2, 3])
      end
    end
  end

  describe "varargs" do
    it "should pass for correct input" do
      expect do
        @o.sum(1, 2, 3)
      end.to_not raise_error
    end

    it "should fail for incorrect input" do
      expect do
        @o.sum(1, 2, "bad")
      end.to raise_error(ContractError)
    end

    it "should work with arg before splat" do
      expect do
        @o.arg_then_splat(3, "hello", "world")
      end.to_not raise_error
    end
  end

  describe "varargs with block" do
    it "should pass for correct input" do
      expect do
        @o.with_partial_sums(1, 2, 3) do |partial_sum|
          2 * partial_sum + 1
        end
      end.not_to raise_error
      expect do
        @o.with_partial_sums_contracted(1, 2, 3) do |partial_sum|
          2 * partial_sum + 1
        end
      end.not_to raise_error
    end

    it "should fail for incorrect input" do
      expect do
        @o.with_partial_sums(1, 2, "bad") do |partial_sum|
          2 * partial_sum + 1
        end
      end.to raise_error(ContractError, /Actual: "bad"/)

      expect do
        @o.with_partial_sums(1, 2, 3)
      end.to raise_error(ContractError, /Actual: nil/)

      expect do
        @o.with_partial_sums(1, 2, 3, lambda { |x| x })
      end.to raise_error(ContractError, /Actual: nil/)
    end

    context "when block has Func contract" do
      it "should fail for incorrect input" do
        expect do
          @o.with_partial_sums_contracted(1, 2, "bad") { |partial_sum| 2 * partial_sum + 1 }
        end.to raise_error(ContractError, /Actual: "bad"/)

        expect do
          @o.with_partial_sums_contracted(1, 2, 3)
        end.to raise_error(ContractError, /Actual: nil/)
      end
    end
  end

  describe "contracts on functions" do
    it "should pass for a function that passes the contract" do
      expect { @o.map([1, 2, 3], lambda { |x| x + 1 }) }.to_not raise_error
    end

    it "should pass for a function that passes the contract as in tutorial" do
      expect { @o.tutorial_map([1, 2, 3], lambda { |x| x + 1 }) }.to_not raise_error
    end

    it "should fail for a function that doesn't pass the contract" do
      expect { @o.map([1, 2, 3], lambda { |_| "bad return value" }) }.to raise_error(ContractError)
    end

    it "should pass for a function that passes the contract with weak other args" do
      expect { @o.map_plain(["hello", "joe"], lambda { |x| x.size }) }.to_not raise_error
    end

    it "should fail for a function that doesn't pass the contract with weak other args" do
      expect { @o.map_plain(["hello", "joe"], lambda { |_| nil }) }.to raise_error(ContractError)
    end

    it "should fail for a returned function that doesn't pass the contract" do
      expect { @o.lambda_with_wrong_return.call("hello") }.to raise_error(ContractError)
    end

    it "should fail for a returned function that receives the wrong argument type" do
      expect { @o.lambda_with_correct_return.call(123) }.to raise_error(ContractError)
    end

    it "should not fail for a returned function that passes the contract" do
      expect { @o.lambda_with_correct_return.call("hello") }.to_not raise_error
    end
  end

  describe "default args to functions" do
    it "should work for a function call that relies on default args" do
      expect { @o.default_args }.to_not raise_error
      expect { @o.default_args("foo") }.to raise_error(ContractError)
    end
  end

  describe "classes" do
    it "should not fail for an object that is the exact type as the contract" do
      p = Parent.new
      expect { @o.id_(p) }.to_not raise_error
    end

    it "should not fail for an object that is a subclass of the type in the contract" do
      c = Child.new
      expect { @o.id_(c) }.to_not raise_error
    end
  end

  describe "failure callbacks" do
    before :each do
      ::Contract.override_failure_callback do |_data|
        should_call
      end
    end

    context "when failure_callback returns false" do
      let(:should_call) { false }

      it "does not call a function for which the contract fails" do
        res = @o.double("bad")
        expect(res).to eq(nil)
      end
    end

    context "when failure_callback returns true" do
      let(:should_call) { true }

      it "calls a function for which the contract fails" do
        res = @o.double("bad")
        expect(res).to eq("badbad")
      end
    end
  end

  describe "module contracts" do
    it "passes for instance of class including module" do
      expect(
        ModuleContractExample.hello(ModuleContractExample::AClassWithModule.new)
      ).to eq(:world)
    end

    it "passes for instance of class including inherited module" do
      expect(
        ModuleContractExample.hello(ModuleContractExample::AClassWithInheritedModule.new)
      ).to eq(:world)
    end

    it "does not pass for instance of class not including module" do
      expect do
        ModuleContractExample.hello(ModuleContractExample::AClassWithoutModule.new)
      end.to raise_error(ContractError, /Expected: ModuleContractExample::AModule/)
    end

    it "does not pass for instance of class including another module" do
      expect do
        ModuleContractExample.hello(ModuleContractExample::AClassWithAnotherModule.new)
      end.to raise_error(ContractError, /Expected: ModuleContractExample::AModule/)
    end

    it "passes for instance of class including both modules" do
      expect(
        ModuleContractExample.hello(ModuleContractExample::AClassWithBothModules.new)
      ).to eq(:world)
    end
  end

  describe "Contracts to_s formatting in expected" do
    def not_s(match)
      Regexp.new "[^\"\']#{match}[^\"\']"
    end

    def delim(match)
      "(#{match})"
    end

    it "should not stringify native types" do
      expect do
        @o.constanty("bad", nil)
      end.to raise_error(ContractError, not_s(123))

      expect do
        @o.constanty(123, "bad")
      end.to raise_error(ContractError, not_s(nil))
    end

    it "should contain to_s representation within a Hash contract" do
      expect do
        @o.hash_complex_contracts({ :rigged => "bad" })
      end.to raise_error(ContractError, not_s(delim "TrueClass or FalseClass"))
    end

    it "should contain to_s representation within a nested Hash contract" do
      expect do
        @o.nested_hash_complex_contracts({
          :rigged => true,
          :contents => {
            :kind => 0,
            :total => 42,
          },
        })
      end.to raise_error(ContractError, not_s(delim "String or Symbol"))
    end

    it "should contain to_s representation within an Array contract" do
      expect do
        @o.array_complex_contracts(["bad"])
      end.to raise_error(ContractError, not_s(delim "TrueClass or FalseClass"))
    end

    it "should contain to_s representation within a nested Array contract" do
      expect do
        @o.nested_array_complex_contracts([true, [0]])
      end.to raise_error(ContractError, not_s(delim "String or Symbol"))
    end

    it "should wrap and pretty print for long param contracts" do
      expect do
        @o.long_array_param_contracts(true)
      end.to(
        raise_error(
          ParamContractError,
          /\[\(String or Symbol\),\n                   \(String or Symbol\),/
        )
      )
    end

    it "should wrap and pretty print for long return contracts" do
      expect do
        @o.long_array_return_contracts
      end.to(
        raise_error(
          ReturnContractError,
          /\[\(String or Symbol\),\n                   \(String or Symbol\),/
        )
      )
    end

    it "should not contain Contracts:: module prefix" do
      expect do
        @o.double("bad")
      end.to raise_error(ContractError, /Expected: Num/)
    end

    it "should still show nils, not just blank space" do
      expect do
        @o.no_args("bad")
      end.to raise_error(ContractError, /Expected: nil/)
    end

    it 'should show empty quotes as ""' do
      expect do
        @o.no_args("")
      end.to raise_error(ContractError, /Actual: ""/)
    end

    it "should not use custom to_s if empty string" do
      expect do
        @o.using_empty_contract("bad")
      end.to raise_error(ContractError, /Expected: EmptyCont/)
    end
  end

  describe "functype" do
    it "should correctly print out a instance method's type" do
      expect(@o.functype(:double)).not_to eq("")
    end

    it "should correctly print out a class method's type" do
      expect(A.functype(:a_class_method)).not_to eq("")
    end
  end

  describe "private methods" do
    it "should raise an error if you try to access a private method" do
      expect { @o.a_private_method }.to raise_error(NoMethodError, /private/)
    end

    it "should raise an error if you try to access a private method" do
      expect { @o.a_really_private_method }.to raise_error(NoMethodError, /private/)
    end
  end

  describe "protected methods" do
    it "should raise an error if you try to access a protected method" do
      expect { @o.a_protected_method }.to raise_error(NoMethodError, /protected/)
    end

    it "should raise an error if you try to access a protected method" do
      expect { @o.a_really_protected_method }.to raise_error(NoMethodError, /protected/)
    end
  end

  describe "inherited methods" do
    it "should apply the contract to an inherited method" do
      c = Child.new
      expect { c.double(2) }.to_not raise_error
      expect { c.double("asd") }.to raise_error ParamContractError
    end
  end

  describe "classes with extended modules" do
    let(:klass) do
      m = Module.new do
        include Contracts::Core
      end

      Class.new do
        include Contracts::Core
        extend m

        Contract String => nil
        def foo(x)
        end
      end
    end

    it "is possible to define it" do
      expect { klass }.not_to raise_error
    end

    it "works correctly with methods with passing contracts" do
      expect { klass.new.foo("bar") }.not_to raise_error
    end

    it "works correctly with methods with passing contracts" do
      expect { klass.new.foo(42) }.to raise_error(ContractError, /Expected: String/)
    end

    # See the discussion on this issue:
    # https://github.com/egonSchiele/contracts.ruby/issues/229
    it "should not fail with 'undefined method 'Contract''" do
      expect do
        class ModuleThenContracts
          include ModuleWithContracts
          include Contracts::Core

          # fails on this line
          Contract C::Num => C::Num
          def double(x)
            x * 2
          end
        end
      end.to_not raise_error
    end
  end
end
