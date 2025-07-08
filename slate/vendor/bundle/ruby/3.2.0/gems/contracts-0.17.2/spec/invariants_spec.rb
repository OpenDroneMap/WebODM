module Contracts
  RSpec.describe Invariants do
    def new_subject
      MyBirthday.new(31, 12)
    end

    it "works when all invariants are holding" do
      expect { new_subject.clever_next_day! }.not_to raise_error
      expect { new_subject.clever_next_month! }.not_to raise_error
    end

    it "raises invariant violation error when any of invariants are not holding" do
      expect { new_subject.silly_next_day! }.to raise_error(InvariantError, /day condition to be true/)
      expect { new_subject.silly_next_month! }.to raise_error(InvariantError, /month condition to be true/)
    end
  end
end
