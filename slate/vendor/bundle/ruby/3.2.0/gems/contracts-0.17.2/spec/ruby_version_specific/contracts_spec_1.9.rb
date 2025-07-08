class GenericExample
  Contract C::Args[String], C::Num => C::ArrayOf[String]
  def splat_then_arg(*vals, n)
    vals.map { |v| v * n }
  end

  if ruby_version <= 1.9
    Contract ({:foo => C::Nat}) => nil
    def nat_test_with_kwarg(a_hash)
    end
  end
end

RSpec.describe "Contracts:" do
  before :all do
    @o = GenericExample.new
  end

  describe "Splat not last (or penultimate to block)" do
    it "should work with arg after splat" do
      expect { @o.splat_then_arg("hello", "world", 3) }.to_not raise_error
    end
  end
end
