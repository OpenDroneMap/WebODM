require File.expand_path('../spec_helper', __FILE__)

if Servolux.fork?
describe Servolux::Piper do
  before :each do
    @piper = nil
  end

  after :each do
    next if @piper.nil?
    @piper.puts :die rescue nil
    @piper.close
    @piper = nil
  end

  it 'only understands three file modes' do
    %w[r w rw].each do |mode|
      expect {
        piper = Servolux::Piper.new(mode)
        piper.child { piper.close; exit! }
        piper.parent { piper.close }
      }.not_to raise_error
    end

    expect {
      Servolux::Piper.new('f')
    }.to raise_error(ArgumentError, 'Unsupported mode "f"')
  end

  it 'enables communication between parents and children' do
    @piper = Servolux::Piper.new 'rw', :timeout => 2

    @piper.child {
      loop {
        obj = @piper.gets
        if :die == obj
          @piper.close; exit!
        end
        @piper.puts obj unless obj.nil?
      }
      exit!
    }

    @piper.parent {
      @piper.puts 'foo bar baz'
      expect(@piper.gets).to eq('foo bar baz')

      @piper.puts %w[one two three]
      expect(@piper.gets).to eq(%w[one two three])

      expect(@piper.puts('Returns # of bytes written')).to be > 0
      expect(@piper.gets).to eq('Returns # of bytes written')

      @piper.puts 1
      @piper.puts 2
      @piper.puts 3
      expect(@piper.gets).to eq(1)
      expect(@piper.gets).to eq(2)
      expect(@piper.gets).to eq(3)

      @piper.timeout = 0.1
      expect(@piper).not_to be_readable
    }
  end

  it 'sends signals from parent to child' do
    @piper = Servolux::Piper.new 'rw', :timeout => 2

    @piper.child {
      Signal.trap('USR2') { @piper.puts "'USR2' was received" rescue nil }
      Signal.trap('INT') {
        @piper.puts "'INT' was received" rescue nil
        @piper.close
        exit!
      }
      Thread.new { sleep 7; exit! }
      @piper.puts :ready
      loop { sleep }
      exit!
    }

    @piper.parent {
      expect(@piper.gets).to eq(:ready)

      @piper.signal 'USR2'
      expect(@piper.gets).to eq("'USR2' was received")

      @piper.signal 'INT'
      expect(@piper.gets).to eq("'INT' was received")
    }
  end

  it 'creates a daemon process' do
    @piper = Servolux::Piper.daemon(true, true)

    @piper.child {
      @piper.puts Process.ppid
      @piper.close
      exit!
    }

    @piper.parent {
      expect(@piper.gets).not_to eq(Process.pid)
    }
  end
end
end  # if Servolux.fork?

