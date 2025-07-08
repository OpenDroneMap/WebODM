RSpec.describe "Contracts:" do
  describe "method called with blocks" do
    module FuncTest
      include Contracts::Core
      include Contracts::Builtin

      Contract Func[Num=>Num] => nil
      def foo(&blk)
        _ = blk.call(2)
        nil
      end

      Contract Num, Func[Num=>Num] => nil
      def foo2(a, &blk)
        _ = blk.call(2)
        nil
      end

      Contract Func[Num=>Num] => nil
      def bar(blk)
        _ = blk.call(2)
        nil
      end

      Contract Num, Func[Num=>Num] => nil
      def bar2(a, blk)
        _ = blk.call(2)
        nil
      end
    end

    def obj
      Object.new.tap do |o|
        o.extend(FuncTest)
      end
    end

    it "should enforce return value inside block with no other parameter" do
      expect { obj.foo(&:to_s) }.to raise_error ReturnContractError
    end

    it "should enforce return value inside block with other parameter" do
      expect { obj.foo2(2) { |x| x.to_s } }.to raise_error ReturnContractError
    end

    it "should enforce return value inside lambda with no other parameter" do
      expect { obj.bar lambda { |x| x.to_s } }.to raise_error ReturnContractError
    end

    it "should enforce return value inside lambda with other parameter" do
      expect { obj.bar2(2, lambda { |x| x.to_s }) }.to raise_error ReturnContractError
    end
  end
end
