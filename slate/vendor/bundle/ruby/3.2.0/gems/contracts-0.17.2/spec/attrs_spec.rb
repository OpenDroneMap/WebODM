RSpec.describe "Contracts:" do
  describe "Attrs:" do
    class Person
      include Contracts::Core
      include Contracts::Attrs
      include Contracts::Builtin

      def initialize(name)
        @name_r = name
        @name_w = name
        @name_rw = name

        @name_r_2 = name
        @name_w_2 = name
        @name_rw_2 = name
      end

      attr_reader_with_contract :name_r, :name_r_2, String
      attr_writer_with_contract :name_w, :name_w_2, String
      attr_accessor_with_contract :name_rw, :name_rw_2, String
    end

    context "attr_reader_with_contract" do
      it "getting valid type" do
        expect(Person.new("bob").name_r)
          .to(eq("bob"))
      end

      it "getting invalid type" do
        expect { Person.new(1.3).name_r }
          .to(raise_error(ReturnContractError))
      end

      it "getting valid type for second val" do
        expect(Person.new("bob").name_r_2)
          .to(eq("bob"))
      end

      it "getting invalid type for second val" do
        expect { Person.new(1.3).name_r_2 }
          .to(raise_error(ReturnContractError))
      end

      it "setting" do
        expect { Person.new("bob").name_r = "alice" }
          .to(raise_error(NoMethodError))
      end
    end

    context "attr_writer_with_contract" do
      it "getting" do
        expect { Person.new("bob").name_w }
          .to(raise_error(NoMethodError))
      end

      it "setting valid type" do
        expect(Person.new("bob").name_w = "alice")
          .to(eq("alice"))
      end

      it "setting invalid type" do
        expect { Person.new("bob").name_w = 1.2 }
          .to(raise_error(ParamContractError))
      end

      it "setting valid type for second val" do
        expect(Person.new("bob").name_w_2 = "alice")
          .to(eq("alice"))
      end

      it "setting invalid type for second val" do
        expect { Person.new("bob").name_w_2 = 1.2 }
          .to(raise_error(ParamContractError))
      end
    end

    context "attr_accessor_with_contract" do
      it "getting valid type" do
        expect(Person.new("bob").name_rw)
          .to(eq("bob"))
      end

      it "getting invalid type" do
        expect { Person.new(1.2).name_rw }
          .to(raise_error(ReturnContractError))
      end

      it "setting valid type" do
        expect(Person.new("bob").name_rw = "alice")
          .to(eq("alice"))
      end

      it "setting invalid type" do
        expect { Person.new("bob").name_rw = 1.2 }
          .to(raise_error(ParamContractError))
      end

      it "getting valid type for second val" do
        expect(Person.new("bob").name_rw_2)
          .to(eq("bob"))
      end

      it "getting invalid type for second val" do
        expect { Person.new(1.2).name_rw_2 }
          .to(raise_error(ReturnContractError))
      end

      it "setting valid type for second val" do
        expect(Person.new("bob").name_rw_2 = "alice")
          .to(eq("alice"))
      end

      it "setting invalid type for second val" do
        expect { Person.new("bob").name_rw_2 = 1.2 }
          .to(raise_error(ParamContractError))
      end
    end
  end
end
