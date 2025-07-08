
require File.expand_path('../spec_helper', __FILE__)

describe Servolux::Server do

  def wait_until( seconds = 5 )
    start = Time.now
    sleep 0.250 until ((Time.now - start) > seconds) || yield
  end

  def readlog
    @log_output.readline
  end

  base = Class.new(Servolux::Server) do
    def initialize
      super('Test Server', :logger => Logging.logger['Servolux'])
    end
    def run() sleep; end
  end

  before :each do
    @server = base.new
    @server.pid_file.delete
  end

  after :each do
    @server.shutdown
    @server.wait_for_shutdown
    wait_until { @t.status == false } if @t && @t.alive?
  end

  it 'generates a PID file' do
    expect(@server.pid_file).to_not exist

    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    expect(@server.pid_file).to exist

    @server.shutdown
    wait_until { @t.status == false }
    expect(@server.pid_file).to_not exist
  end

  it 'generates a PID file with mode rw-r----- by default' do
    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    expect(@server.pid_file).to exist

    expect(readlog.chomp).to eq(%q(DEBUG  Servolux : Writing pid file "./test_server.pid"))
    expect(readlog.chomp).to eq(%q(DEBUG  Servolux : Starting))

    filename = @server.pid_file.filename
    mode = File.stat(filename).mode & 0777
    expect(mode).to eq(0640)

    @server.shutdown
    wait_until { @t.status == false }
    expect(@server.pid_file).to_not exist
  end

  it 'generates PID file with the specified permissions' do
    @server.pid_file.mode = 0400
    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    expect(@server.pid_file).to exist

    expect(readlog.chomp).to eq(%q(DEBUG  Servolux : Writing pid file "./test_server.pid"))
    expect(readlog.chomp).to eq(%q(DEBUG  Servolux : Starting))

    filename = @server.pid_file.filename
    mode = File.stat(filename).mode & 0777
    expect(mode).to eq(0400)

    @server.shutdown
    wait_until { @t.status == false }
    expect(@server.pid_file).to_not exist
  end

  it 'shuts down gracefully when signaled' do
    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    expect(@server).to be_running

    Process.kill 'SIGINT', $$
    wait_until { @t.status == false }
    expect(@server).to_not be_running
  end

  it 'responds to signals that have defined handlers' do
    class << @server
      def hup() logger.info 'hup was called'; end
      def usr1() logger.info 'usr1 was called'; end
      def usr2() logger.info 'usr2 was called'; end
    end

    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    readlog
    expect(readlog.strip).to eq('DEBUG  Servolux : Starting')

    line = nil
    Process.kill 'SIGUSR1', $$
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to eq('INFO  Servolux : usr1 was called')

    line = nil
    Process.kill 'SIGHUP', $$
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to eq('INFO  Servolux : hup was called')

    line = nil
    Process.kill 'SIGUSR2', $$
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to eq('INFO  Servolux : usr2 was called')

    Process.kill 'SIGTERM', $$
    wait_until { @t.status == false }
    expect(@server).to_not be_running
  end

  it 'captures exceptions raised by the signal handlers' do
    class << @server
      def usr2() raise 'Ooops!'; end
    end

    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    readlog
    expect(readlog.strip).to eq('DEBUG  Servolux : Starting')

    line = nil
    Process.kill 'SIGUSR2', $$
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to eq('ERROR  Servolux : Exception in signal handler: usr2')

    line = nil
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to eq('ERROR  Servolux : <RuntimeError> Ooops!')
  end

  it 'logs when the signal handler thread exits' do
    class << @server
      def hup() logger.info 'hup was called'; end
    end

    @t = Thread.new {@server.startup}
    wait_until { @server.running? and @t.status == 'sleep' }
    readlog
    expect(readlog.strip).to eq('DEBUG  Servolux : Starting')

    line = nil
    @server.__send__(:halt_signal_processing)
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to eq('INFO  Servolux : Signal processing thread has stopped')

    line = nil
    Process.kill 'SIGHUP', $$
    wait_until { line = readlog }
    expect(line).to_not be_nil
    expect(line.strip).to    eq('ERROR  Servolux : Exception in signal handler: hup')
    expect(readlog.strip).to eq('ERROR  Servolux : <IOError> closed stream')
  end
end
