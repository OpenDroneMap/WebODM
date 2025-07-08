RSpec.describe "Contracts:" do
  before :all do
    @o = GenericExample.new
  end

  def fails(&some)
    expect { some.call }.to raise_error(ContractError)
  end

  def passes(&some)
    expect { some.call }.to_not raise_error
  end

  describe "DescendantOf:" do
    it "should pass for Array" do
      passes { @o.enumerable_descendant_test(Array) }
    end

    it "should pass for a hash" do
      passes { @o.enumerable_descendant_test(Hash) }
    end

    it "should fail for a number class" do
      fails { @o.enumerable_descendant_test(Integer) }
    end

    it "should fail for a non-class" do
      fails { @o.enumerable_descendant_test(1) }
    end
  end

  describe "Num:" do
    it "should pass for Integers" do
      passes { @o.double(2) }
    end

    it "should pass for Floats" do
      passes { @o.double(2.2) }
    end

    it "should fail for nil and other data types" do
      fails { @o.double(nil) }
      fails { @o.double(:x) }
      fails { @o.double("x") }
      fails { @o.double(/x/) }
    end
  end

  describe "Pos:" do
    it "should pass for positive numbers" do
      passes { @o.pos_test(1) }
      passes { @o.pos_test(1.6) }
    end

    it "should fail for 0" do
      fails { @o.pos_test(0) }
    end

    it "should fail for negative numbers" do
      fails { @o.pos_test(-1) }
      fails { @o.pos_test(-1.6) }
    end

    it "should fail for nil and other data types" do
      fails { @o.pos_test(nil) }
      fails { @o.pos_test(:x)  }
      fails { @o.pos_test("x") }
      fails { @o.pos_test(/x/) }
    end
  end

  describe "Neg:" do
    it "should pass for negative numbers" do
      passes { @o.neg_test(-1) }
      passes { @o.neg_test(-1.6) }
    end

    it "should fail for 0" do
      fails { @o.neg_test(0) }
    end

    it "should fail for positive numbers" do
      fails { @o.neg_test(1) }
      fails { @o.neg_test(1.6) }
    end

    it "should fail for nil and other data types" do
      fails { @o.neg_test(nil) }
      fails { @o.neg_test(:x)  }
      fails { @o.neg_test("x") }
      fails { @o.neg_test(/x/) }
    end
  end

  describe "Nat:" do
    it "should pass for 0" do
      passes { @o.nat_test(0) }
    end

    it "should pass for positive whole numbers" do
      passes { @o.nat_test(1) }
    end

    it "should fail for positive non-whole numbers" do
      fails { @o.nat_test(1.5) }
    end

    it "should fail for negative numbers" do
      fails { @o.nat_test(-1) }
      fails { @o.nat_test(-1.6) }
    end

    it "should fail for nil and other data types" do
      fails { @o.nat_test(nil) }
      fails { @o.nat_test(:x)  }
      fails { @o.nat_test("x") }
      fails { @o.nat_test(/x/) }
    end
  end

  describe "Any:" do
    it "should pass for numbers" do
      passes { @o.show(1) }
    end
    it "should pass for strings" do
      passes { @o.show("bad") }
    end
    it "should pass for procs" do
      passes { @o.show(lambda {}) }
    end
    it "should pass for nil" do
      passes { @o.show(nil) }
    end
  end

  describe "None:" do
    it "should fail for numbers" do
      fails { @o.fail_all(1) }
    end
    it "should fail for strings" do
      fails { @o.fail_all("bad") }
    end
    it "should fail for procs" do
      fails { @o.fail_all(lambda {}) }
    end
    it "should fail for nil" do
      fails { @o.fail_all(nil) }
    end
  end

  describe "Or:" do
    it "should pass for nums" do
      passes { @o.num_or_string(1) }
    end

    it "should pass for strings" do
      passes { @o.num_or_string("bad") }
    end

    it "should fail for nil" do
      fails { @o.num_or_string(nil) }
    end
  end

  describe "Xor:" do
    it "should pass for an object with a method :good" do
      passes { @o.xor_test(A.new) }
    end

    it "should pass for an object with a method :bad" do
      passes { @o.xor_test(B.new) }
    end

    it "should fail for an object with neither method" do
      fails { @o.xor_test(1) }
    end

    it "should fail for an object with both methods :good and :bad" do
      fails { @o.xor_test(F.new) }
    end
  end

  describe "And:" do
    it "should pass for an object of class A that has a method :good" do
      passes { @o.and_test(A.new) }
    end

    it "should fail for an object that has a method :good but isn't of class A" do
      fails { @o.and_test(F.new) }
    end
  end

  describe "Enum:" do
    it "should pass for an object that is included" do
      passes { @o.enum_test(:a) }
    end

    it "should fail for an object that is not included" do
      fails { @o.enum_test(:z) }
    end
  end

  describe "RespondTo:" do
    it "should pass for an object that responds to :good" do
      passes { @o.responds_test(A.new) }
    end

    it "should fail for an object that doesn't respond to :good" do
      fails { @o.responds_test(B.new) }
    end
  end

  describe "Send:" do
    it "should pass for an object that returns true for method :good" do
      passes { @o.send_test(A.new) }
    end

    it "should fail for an object that returns false for method :good" do
      fails { @o.send_test(F.new) }
    end
  end

  describe "Exactly:" do
    it "should pass for an object that is exactly a Parent" do
      passes { @o.exactly_test(Parent.new) }
    end

    it "should fail for an object that inherits from Parent" do
      fails { @o.exactly_test(Child.new) }
    end

    it "should fail for an object that is not related to Parent at all" do
      fails { @o.exactly_test(A.new) }
    end
  end

  describe "Eq:" do
    it "should pass for a class" do
      passes { @o.eq_class_test(Foo) }
    end

    it "should pass for a module" do
      passes { @o.eq_module_test(Bar) }
    end

    it "should pass for other values" do
      passes { @o.eq_value_test(Baz) }
    end

    it "should fail when not equal" do
      fails { @o.eq_class_test(Bar) }
    end

    it "should fail when given instance of class" do
      fails { @o.eq_class_test(Foo.new) }
    end
  end

  describe "Not:" do
    it "should pass for an argument that isn't nil" do
      passes { @o.not_nil(1) }
    end

    it "should fail for nil" do
      fails { @o.not_nil(nil) }
    end
  end

  describe "ArrayOf:" do
    it "should pass for an array of nums" do
      passes { @o.product([1, 2, 3]) }
    end

    it "should fail for an array with one non-num" do
      fails { @o.product([1, 2, 3, "bad"]) }
    end

    it "should fail for a non-array" do
      fails { @o.product(1) }
    end
  end

  describe "RangeOf:" do
    require "date"
    it "should pass for a range of nums" do
      passes { @o.first_in_range_num(3..10) }
    end

    it "should pass for a range of dates" do
      d1 = Date.today
      d2 = d1 + 18
      passes { @o.first_in_range_date(d1..d2) }
    end

    it "should fail for a non-range" do
      fails { @o.first_in_range_num("foo") }
      fails { @o.first_in_range_num(:foo) }
      fails { @o.first_in_range_num(5) }
      fails { @o.first_in_range_num(nil) }
    end

    it "should fail for a range with incorrect data type" do
      fails { @o.first_in_range_num("a".."z") }
    end

    it "should fail for a badly-defined range" do
      # For some reason, Ruby 2.0.0 allows (date .. number) as a range.
      # Perhaps other Ruby versions do too.
      # Note that (date .. string) gives ArgumentError.
      # This test guards against ranges with inconsistent data types.
      begin
        d1 = Date.today
        fails { @o.first_in_range_date(d1..10) }
        fails { @o.first_in_range_num(d1..10) }
      rescue ArgumentError
        # If Ruby doesn't like the range, we ignore the test.
        :nop
      end
    end
  end

  describe "SetOf:" do
    it "should pass for a set of nums" do
      passes { @o.product_from_set(Set.new([1, 2, 3])) }
    end

    it "should fail for an array with one non-num" do
      fails { @o.product_from_set(Set.new([1, 2, 3, "bad"])) }
    end

    it "should fail for a non-array" do
      fails { @o.product_from_set(1) }
    end
  end

  describe "Bool:" do
    it "should pass for an argument that is a boolean" do
      passes { @o.bool_test(true) }
      passes { @o.bool_test(false) }
    end

    it "should fail for nil" do
      fails { @o.bool_test(nil) }
    end
  end

  describe "Maybe:" do
    it "should pass for nums" do
      expect(@o.maybe_double(1)).to eq(2)
    end

    it "should pass for nils" do
      expect(@o.maybe_double(nil)).to eq(nil)
    end

    it "should fail for strings" do
      fails { @o.maybe_double("foo") }
    end
  end

  describe "KeywordArgs:" do
    it "should pass for exact correct input" do
      passes { @o.person_keywordargs(:name => "calvin", :age => 10) }
    end

    it "should fail if some keys don't have contracts" do
      fails { @o.person_keywordargs(:name => "calvin", :age => 10, :foo => "bar") }
    end

    it "should fail if a key with a contract on it isn't provided" do
      fails { @o.person_keywordargs(:name => "calvin") }
    end

    it "should fail for incorrect input" do
      fails { @o.person_keywordargs(:name => 50, :age => 10) }
      fails { @o.hash_keywordargs(:hash => nil) }
      fails { @o.hash_keywordargs(:hash => 1) }
    end
  end

  describe "Optional:" do
    it "can't be used outside of KeywordArgs" do
      expect do
        BareOptionalContractUsed.new.something(3, 5)
      end.to raise_error(ArgumentError, Contracts::Optional::UNABLE_TO_USE_OUTSIDE_OF_OPT_HASH)
    end
  end

  describe "HashOf:" do
    it "doesn't allow to specify multiple key-value pairs with pretty syntax" do
      expect do
        Class.new do
          include Contracts::Core

          Contract Contracts::HashOf[Symbol => String, Contracts::Num => Contracts::Num] => nil
          def something(hash)
            # ...
          end
        end
      end.to raise_error(ArgumentError, "You should provide only one key-value pair to HashOf contract")
    end

    context "given a fulfilled contract" do
      it { expect(@o.gives_max_value({ :panda => 1, :bamboo => 2 })).to eq(2) }
      it { expect(@o.pretty_gives_max_value({ :panda => 1, :bamboo => 2 })).to eq(2) }
    end

    context "given an unfulfilled contract" do
      it { fails { @o.gives_max_value({ :panda => "1", :bamboo => "2" }) }  }
      it { fails { @o.gives_max_value(nil) } }
      it { fails { @o.gives_max_value(1) } }
      it { fails { @o.pretty_gives_max_value({ :panda => "1", :bamboo => "2" }) } }
    end

    describe "#to_s" do
      context "given Symbol => String" do
        it { expect(Contracts::HashOf[Symbol, String].to_s).to eq("Hash<Symbol, String>") }
      end

      context "given String => Num" do
        it { expect(Contracts::HashOf[String, Contracts::Num].to_s).to eq("Hash<String, Contracts::Builtin::Num>") }
      end
    end
  end

  describe "StrictHash:" do
    context "when given an exact correct input" do
      it "does not raise an error" do
        passes { @o.strict_person({ :name => "calvin", :age => 10 }) }
      end
    end

    context "when given an input with correct keys but wrong types" do
      it "raises an error" do
        fails { @o.strict_person({ :name => "calvin", :age => "10" }) }
      end
    end

    context "when given an input with missing keys" do
      it "raises an error" do
        fails { @o.strict_person({ :name => "calvin" }) }
      end
    end

    context "when given an input with extra keys" do
      it "raises an error" do
        fails { @o.strict_person({ :name => "calvin", :age => 10, :soft => true }) }
      end
    end

    context "when given not a hash" do
      it "raises an error" do
        fails { @o.strict_person(1337) }
      end
    end
  end
end
