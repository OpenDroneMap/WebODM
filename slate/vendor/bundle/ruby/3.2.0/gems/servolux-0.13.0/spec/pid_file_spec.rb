require File.expand_path('../spec_helper', __FILE__)

describe Servolux::PidFile do
  before :all do
    tmp = Tempfile.new "servolux-pid-file"
    @path = tmp.path; tmp.unlink
    FileUtils.mkdir @path
  end

  after :all do
    FileUtils.rm_rf @path
  end

  before :each do
    FileUtils.rm_f Dir.glob("#@path/*.pid")
    @pid_file = Servolux::PidFile.new \
      :name   => "test",
      :path   => @path,
      :logger => Logging.logger['Servolux']

    @filename = @pid_file.filename
  end

  describe "filename" do
    it "normalizes the process name" do
      pid = Servolux::PidFile.new :name => "Test Server"
      expect(pid.filename).to eq("./test_server.pid")
    end

    it "includes the path" do
      pid = Servolux::PidFile.new :name => "Test Server", :path => @path
      expect(pid.filename).to eq("#@path/test_server.pid")
    end
  end

  describe "creating" do
    it "writes a PID file" do
      expect(test(?e, @filename)).to be false

      @pid_file.write(123456)
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Writing pid file "#@path/test.pid"})

      pid = Integer(File.read(@filename).strip)
      expect(pid).to eq(123456)
    end

    it "uses mode rw-r----- by default" do
      expect(test(?e, @filename)).to be false

      @pid_file.write
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Writing pid file "#@path/test.pid"})

      mode = File.stat(@filename).mode & 0777
      expect(mode).to eq(0640)
    end

    it "uses the given mode" do
      @pid_file.mode = 0400
      expect(test(?e, @filename)).to be false

      @pid_file.write
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Writing pid file "#@path/test.pid"})

      mode = File.stat(@filename).mode & 0777
      expect(mode).to eq(0400)
    end
  end

  describe "deleting" do
    it "removes a PID file" do
      expect(test(?e, @filename)).to be false
      expect { @pid_file.delete }.not_to raise_error

      @pid_file.write
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Writing pid file "#@path/test.pid"})

      @pid_file.delete
      expect(test(?e, @filename)).to be false
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Deleting pid file "#@path/test.pid"})
    end

    it "removes the PID file only from the same process" do
      @pid_file.write(654321)
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Writing pid file "#@path/test.pid"})

      @pid_file.delete
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline).to be_nil
    end

    it "can forcibly remove a PID file" do
      @pid_file.write(135790)
      expect(test(?e, @filename)).to be true
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Writing pid file "#@path/test.pid"})

      @pid_file.delete!
      expect(test(?e, @filename)).to be false
      expect(@log_output.readline.chomp).to \
        eq(%Q{DEBUG  Servolux : Deleting pid file "#@path/test.pid"})
    end
  end

  it "returns the PID from the file" do
    expect(@pid_file.pid).to be_nil

    File.open(@filename, 'w') { |fd| fd.write(314159) }
    expect(@pid_file.pid).to eq(314159)

    File.delete(@filename)
    expect(@pid_file.pid).to be_nil
  end

  it "reports if the process is alive" do
    expect(@pid_file.pid).to be_nil    # there is no PID file yet
    expect(@pid_file).not_to be_alive  # and so we cannot determine
                                       # if the process is alive
    @pid_file.write
    expect(@pid_file.pid).not_to be_nil
    expect(@pid_file).to be_alive
  end
end
