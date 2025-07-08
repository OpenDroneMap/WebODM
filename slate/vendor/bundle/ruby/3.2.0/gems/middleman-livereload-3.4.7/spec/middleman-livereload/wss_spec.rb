require "spec_helper"
require "middleman-livereload/wss"

module Middleman
  module LiveReload
    RSpec.describe Wss do
      let(:wss) { Wss.new certificate, private_key }

      it "prevents missing certificate or private_key" do
        expect { Wss.new nil, "y" }.to raise_error(ArgumentError, /both :wss_certificate and :wss_private_key/)
      end

      describe "#scheme" do
        subject { wss.scheme }

        context "no certificate and no private key" do
          let(:certificate) { nil }
          let(:private_key) { nil }

          it { is_expected.to eq "ws" }
        end

        context "certificate and private key" do
          let(:certificate) { "x" }
          let(:private_key) { "y" }

          it { is_expected.to eq "wss" }
        end
      end

      describe "#to_options" do
        subject { wss.to_options }

        context "no certificate and no private key" do
          let(:certificate) { nil }
          let(:private_key) { nil }

          it { is_expected.to eq Hash.new }
        end

        context "certificate and private key" do
          let(:certificate) { "x" }
          let(:private_key) { "y" }
          let(:options) do
            {
              secure: true,
              tls_options: {
                private_key_file: private_key,
                cert_chain_file: certificate
              }
            }
          end

          it { is_expected.to eq options }
        end
      end

      describe "#valid?" do
        subject { wss.valid? }

        context "no certificate and no private key" do
          let(:certificate) { nil }
          let(:private_key) { nil }

          it { is_expected.to be_falsey }
        end

        context "certificate and private key" do
          let(:certificate) { "x" }
          let(:private_key) { "y" }

          it { is_expected.to be_truthy }
        end
      end
    end
  end
end
