require File.expand_path('../spec_helper', __FILE__)

describe Servolux::Threaded do
  base = Class.new do
    include Servolux::Threaded
    def initialize
      self.interval = 0
      @mutex = Mutex.new
      @signal = ConditionVariable.new
    end
    def pass( val = 'sleep' )
      Thread.pass until status == val
    end
    def send_signal
      @mutex.synchronize {
        @signal.signal
        @signal = nil
      }
    end
    def wait_signal
      @mutex.synchronize {
        @signal.wait(@mutex) unless @signal.nil?
      }
    end
  end

  it "let's you know that it is running" do
    klass = Class.new(base) do
      def run() sleep 1; end
    end

    obj = klass.new
    obj.interval = 0
    expect(obj.running?).to be_nil

    obj.start
    expect(obj).to be_running
    obj.pass

    obj.stop.join(2)
    expect(obj).to_not be_running
  end

  it "stops even when sleeping in the run method" do
    klass = Class.new(base) do
      attr_reader :stopped
      def run() sleep; end
      def after_starting() @stopped = false; end
      def after_stopping() @stopped = true; end
    end

    obj = klass.new
    obj.interval = 0
    expect(obj.stopped).to be_nil

    obj.start
    expect(obj.stopped).to be false
    obj.pass

    obj.stop.join(2)
    expect(obj.stopped).to be true
  end

  it "calls all the before and after hooks" do
    klass = Class.new(base) do
      attr_accessor :ary
      def run() sleep 1; end
      def before_starting() ary << 1; end
      def after_starting() ary << 2; end
      def before_stopping() ary << 3; end
      def after_stopping() ary << 4; end
    end

    obj = klass.new
    obj.interval = 86400
    obj.ary = []

    obj.start
    expect(obj.ary).to eq([1,2])
    obj.pass

    obj.stop.join(2)
    expect(obj.ary).to eq([1,2,3,4])
  end

  it "dies when an exception is thrown" do
    klass = Class.new(base) do
      def run() raise 'ni'; end
    end

    obj = klass.new

    obj.start
    obj.pass nil

    expect(obj).to_not be_running
    @log_output.readline
    expect(@log_output.readline.chomp).to eq("FATAL  Object : <RuntimeError> ni")

    expect { obj.join }.to raise_error(RuntimeError, 'ni')
  end

  it "lives if told to continue on error" do
    klass = Class.new(base) do
      def run()
        @sleep ||= false
        if @sleep
          send_signal
          sleep
        else
          @sleep = true
          raise 'ni'
        end
      end
    end

    obj = klass.new
    obj.continue_on_error = true

    obj.start
    obj.wait_signal

    expect(obj).to be_running
    @log_output.readline
    expect(@log_output.readline.chomp).to eq("ERROR  Object : <RuntimeError> ni")

    obj.stop.join(2)
    expect(obj).to_not be_running
  end

  it "complains loudly if you don't have a run method" do
    obj = base.new
    obj.start
    obj.pass nil

    @log_output.readline
    expect(@log_output.readline.chomp).to eq("FATAL  Object : <NotImplementedError> The run method must be defined by the threaded object.")

    expect { obj.join }.to raise_error(NotImplementedError, 'The run method must be defined by the threaded object.')
  end

  # --------------------------------------------------------------------------
  describe 'when setting maximum iterations' do

    it "stops after a limited number of iterations" do
      klass = Class.new( base ) do
        def run() ; end
      end

      obj = klass.new
      obj.maximum_iterations = 5
      expect(obj.iterations).to eq(0)

      obj.start
      obj.wait
      expect(obj.iterations).to eq(5)
    end

    it "runs the 'after_stopping' method" do
      klass = Class.new( base ) do
        attr_accessor :ary
        def run() ; end
        def after_stopping() ary << 4; end
      end

      obj = klass.new
      obj.maximum_iterations = 5
      obj.ary = []

      obj.start
      obj.wait
      expect(obj.ary).to eq([4])
    end

    it "should not increment iterations if maximum iterations has not been set" do
      klass = Class.new( base ) do
        def run() ; end
      end

      obj = klass.new
      expect(obj.iterations).to eq(0)

      obj.start
      sleep 0.1
      obj.stop.join(2)
      expect(obj.iterations).to eq(0)
    end

    it "complains loudly if you attempt to set a maximum number of iterations < 1" do
      obj = base.new
      expect { obj.maximum_iterations = -1 }.to raise_error( ArgumentError, "maximum iterations must be >= 1" )
    end
  end

  # --------------------------------------------------------------------------
  context 'when running with a strict interval' do

    it "logs a warning if the strict interval is exceeded" do
      klass = Class.new( base ) do
        def run() sleep 0.5; end
      end

      obj = klass.new
      obj.interval = 0.250
      obj.use_strict_interval = true
      obj.maximum_iterations = 2

      obj.start
      obj.wait

      @log_output.readline
      expect(@log_output.readline.chomp).to match(%r/ WARN  Servolux::Threaded::ThreadContainer : Run time \[\d+\.\d+ s\] exceeded strict interval \[0\.25 s\]/)
    end

    it "ignores the strict flag if the interval is zero" do
      klass = Class.new( base ) do
        def run() sleep 0.250; end
      end

      obj = klass.new
      obj.interval = 0
      obj.use_strict_interval = true
      obj.maximum_iterations = 2

      obj.start
      obj.wait

      @log_output.readline
      expect(@log_output.readline).to be_nil
    end
  end
end
