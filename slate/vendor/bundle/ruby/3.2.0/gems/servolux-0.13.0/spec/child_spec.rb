
require File.expand_path('../spec_helper', __FILE__)

describe Servolux::Child do
  before :all do
    @child = Servolux::Child.new
  end

  after :each do
    @child.stop
  end

  it 'has some sensible defaults' do
    expect(@child.command).to be_nil
    expect(@child.timeout).to be_nil
    expect(@child.signals).to eq(%w[TERM QUIT KILL])
    expect(@child.suspend).to eq(4)
    expect(@child.pid).to be_nil
    expect(@child.io).to be_nil
  end

  it 'starts a child process' do
    @child.command = 'echo `pwd`'
    @child.start

    expect(@child.pid).to_not be_nil
    @child.wait
    expect(@child.io.read.strip).to eq(Dir.pwd)
    expect(@child.success?).to be true
  end

  it 'kills a child process after some timeout' do
    @child.command = 'sleep 5; echo `pwd`'
    @child.timeout = 0.25
    @child.start

    expect(@child.pid).to_not be_nil
    @child.wait

    expect(@child.io.read.strip).to be_empty

    expect(@child.signaled?).to be true
    expect(@child.exited?).to be false
    expect(@child.exitstatus).to be_nil
    expect(@child.success?).to be_nil
  end
end
