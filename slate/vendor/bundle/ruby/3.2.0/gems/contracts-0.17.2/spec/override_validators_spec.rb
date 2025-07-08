RSpec.describe Contract do
  describe ".override_validator" do
    around do |example|
      Contract.reset_validators
      example.run
      Contract.reset_validators
    end

    it "allows to override simple validators" do
      Contract.override_validator(Hash) do |contract|
        lambda do |arg|
          return false unless arg.is_a?(Hash)
          # Any hash in my system should have :it_is_a_hash key!
          return false unless arg.key?(:it_is_a_hash)
          contract.keys.all? do |k|
            Contract.valid?(arg[k], contract[k])
          end
        end
      end

      klass = Class.new do
        include Contracts::Core

        Contract ({ :a => Contracts::Num, :b => String }) => nil
        def something(opts)
          nil
        end
      end

      obj = klass.new

      expect do
        obj.something({ :a => 35, :b => "hello" })
      end.to raise_error(ContractError)

      expect do
        obj.something({
          :a => 35,
          :b => "hello",
          :it_is_a_hash => true
        })
      end.not_to raise_error
    end

    it "allows to override valid contract" do
      Contract.override_validator(:valid) do |contract|
        if contract.respond_to?(:in_valid_state?)
          lambda do |arg|
            contract.in_valid_state? && contract.valid?(arg)
          end
        else
          lambda { |arg| contract.valid?(arg) }
        end
      end

      stateful_contract = Class.new(Contracts::CallableClass) do
        def initialize(contract)
          @contract = contract
          @state = 0
        end

        def in_valid_state?
          @state < 3
        end

        def valid?(arg)
          @state += 1
          Contract.valid?(arg, @contract)
        end
      end

      klass = Class.new do
        include Contracts::Core

        Contract stateful_contract[Contracts::Num] => Contracts::Num
        def only_three_times(x)
          x * x
        end
      end

      obj = klass.new

      expect(obj.only_three_times(3)).to eq(9)
      expect(obj.only_three_times(3)).to eq(9)
      expect(obj.only_three_times(3)).to eq(9)

      expect do
        obj.only_three_times(3)
      end.to raise_error(ContractError)

      expect do
        obj.only_three_times(3)
      end.to raise_error(ContractError)
    end

    it "allows to override class validator" do
      # Make contracts accept all rspec doubles
      Contract.override_validator(:class) do |contract|
        lambda do |arg|
          arg.is_a?(RSpec::Mocks::Double) ||
            arg.is_a?(contract)
        end
      end

      klass = Class.new do
        include Contracts::Core

        Contract String => String
        def greet(name)
          "hello, #{name}"
        end
      end

      obj = klass.new

      expect(obj.greet("world")).to eq("hello, world")

      expect do
        obj.greet(4)
      end.to raise_error(ContractError)

      expect(obj.greet(double("name"))).to match(
        /hello, #\[.*Double.*"name"\]/
      )
    end

    it "allows to override default validator" do
      spy = double("spy")

      Contract.override_validator(:default) do |contract|
        lambda do |arg|
          spy.log("#{arg} == #{contract}")
          arg == contract
        end
      end

      klass = Class.new do
        include Contracts::Core

        Contract 1, Contracts::Num => Contracts::Num
        def gcd(_, b)
          b
        end

        Contract Contracts::Num, Contracts::Num => Contracts::Num
        def gcd(a, b)
          gcd(b % a, a)
        end
      end

      obj = klass.new

      expect(spy).to receive(:log).with("8 == 1").ordered.once
      expect(spy).to receive(:log).with("5 == 1").ordered.once
      expect(spy).to receive(:log).with("3 == 1").ordered.once
      expect(spy).to receive(:log).with("2 == 1").ordered.once
      expect(spy).to receive(:log).with("1 == 1").ordered.once

      obj.gcd(8, 5)
    end
  end
end
