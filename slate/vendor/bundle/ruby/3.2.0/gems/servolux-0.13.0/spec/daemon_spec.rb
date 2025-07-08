require File.expand_path('../spec_helper', __FILE__)
require 'fileutils'

if Servolux.fork?
describe Servolux::Daemon do
  TestServer = Module.new {
    def before_starting() @counter = 0; end
    def after_stopping() exit!(0); end
    def run
      @counter += 1
      logger.info "executing run loop [#@counter]"
    end
  }

  log_fn = File.join(Dir.pwd, 'tmp.log')
  pid_fn = File.join(Dir.pwd, 'tmp.pid')

  before(:each) do
    FileUtils.rm_f [log_fn, pid_fn]
    @logger = Logger.new log_fn
  end

  after(:each) do
    @daemon.shutdown if defined? @daemon && @daemon
    FileUtils.rm_f [log_fn, pid_fn]
  end

  it 'waits for an updated logfile when starting' do
    server = Servolux::Server.new('Hey You', :logger => @logger, :interval => 2, :pid_file => pid_fn)
    server.extend TestServer
    @daemon = Servolux::Daemon.new(:server => server, :log_file => log_fn, :timeout => 8)

    @daemon.startup false
    expect(@daemon).to be_alive
  end

  it 'waits for a particular line to appear in the log file' do
    server = Servolux::Server.new('Hey You', :logger => @logger, :interval => 1, :pid_file => pid_fn)
    server.extend TestServer
    @daemon = Servolux::Daemon.new(:server => server, :log_file => log_fn, :look_for => 'executing run loop [2]', :timeout => 8)

    @daemon.startup false
    expect(@daemon).to be_alive
  end

  it 'raises an error if the startup timeout is exceeded' do
    server = Servolux::Server.new('Hey You', :logger => @logger, :interval => 3600, :pid_file => pid_fn)
    server.extend TestServer
    @daemon = Servolux::Daemon.new(:server => server, :log_file => log_fn, :look_for => 'executing run loop [42]', :timeout => 4)

    expect { @daemon.startup }.to raise_error(Servolux::Daemon::Timeout)
  end
end
end  # if Servolux.fork?
