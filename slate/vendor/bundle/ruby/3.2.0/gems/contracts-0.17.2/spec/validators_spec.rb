require "spec_helper"

RSpec.describe "Contract validators" do
  subject(:o) { GenericExample.new }

  describe "Range" do
    it "passes when value is in range" do
      expect do
        o.method_with_range_contract(5)
      end.not_to raise_error
    end

    it "fails when value is not in range" do
      expect do
        o.method_with_range_contract(300)
      end.to raise_error(ContractError, /Expected: 1\.\.10/)
    end

    it "fails when value is incorrect" do
      expect do
        o.method_with_range_contract("hello world")
      end.to raise_error(ContractError, /Expected: 1\.\.10.*Actual: "hello world"/m)
    end
  end

  describe "Regexp" do
    it "should pass for a matching string" do
      expect { o.should_contain_foo("containing foo") }.to_not raise_error
    end

    it "should fail for a non-matching string" do
      expect { o.should_contain_foo("that's not F00") }.to raise_error(ContractError)
    end

    describe "within a hash" do
      it "should pass for a matching string" do
        expect { o.hash_containing_foo({ :host => "foo.example.org" }) }.to_not raise_error
      end
    end

    describe "within an array" do
      it "should pass for a matching string" do
        expect { o.array_containing_foo(["foo"]) }.to_not raise_error
      end
    end
  end
end
