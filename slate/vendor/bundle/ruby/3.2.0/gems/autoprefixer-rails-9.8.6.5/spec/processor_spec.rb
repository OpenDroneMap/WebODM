# frozen_string_literal: true

require_relative "spec_helper"

describe AutoprefixerRails::Processor do
  it "parses config" do
    config    = "# Comment\n ie 11\n \nie 8 # sorry\n[test ]\nios 8"
    processor = AutoprefixerRails::Processor.new
    expect(processor.parse_config(config)).to eql({
                                                    "defaults" => ["ie 11", "ie 8"],
                                                    "test" => ["ios 8"]
                                                  })
  end

  context "without Rails" do
    before do
      hide_const("Rails")
    end

    it "doesn't raise error during processing" do
      processor = AutoprefixerRails::Processor.new
      expect do
        processor.process("")
      end.not_to raise_error
    end
  end
end
