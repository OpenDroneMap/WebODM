require File.expand_path('../spec_helper', __FILE__)

describe Servolux do
  before :all do
    @root_dir = File.expand_path(File.join(File.dirname(__FILE__), '..'))
  end

  it "finds things releative to 'lib'" do
    expect(Servolux.libpath(%w[servolux threaded])).to eq(File.join(@root_dir, %w[lib servolux threaded]))
  end

  it "finds things releative to 'root'" do
    expect(Servolux.path('Rakefile')).to eq(File.join(@root_dir, 'Rakefile'))
  end
end
