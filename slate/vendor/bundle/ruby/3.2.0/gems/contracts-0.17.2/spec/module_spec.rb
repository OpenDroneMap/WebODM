module Mod
  include Contracts::Core

  Contract C::Num => C::Num
  def self.a_module_method a
    a + 1
  end
end

RSpec.describe "module methods" do
  it "should pass for correct input" do
    expect { Mod.a_module_method(2) }.to_not raise_error
  end

  it "should fail for incorrect input" do
    expect { Mod.a_module_method("bad") }.to raise_error(ContractError)
  end
end
