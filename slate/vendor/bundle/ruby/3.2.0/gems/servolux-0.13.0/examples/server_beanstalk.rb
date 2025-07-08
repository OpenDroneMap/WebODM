
require 'rubygems'
require 'servolux'
require 'beanstalk-client'
require 'logger'

# The END block is executed at the *end* of the script. It is here only
# because this is the meat of the running code, and it makes the example more
# "exemplary".
END {

# Create a new Servolux::Server and augment it with our BeanstalkWorkerPool
# methods. The run loop will be executed every 30 seconds by this server.
server = Servolux::Server.new('BeanstalkWorkerPool', :logger => Logger.new($stdout), :interval => 30)
server.extend BeanstalkWorkerPool

# Startup the server. The "before_starting" method will be called and the run
# loop will begin executing. This method will not return until a SIGINT or
# SIGTERM is sent to the server process.
server.startup

}

# The worker pool is managed as a Servolux::Server instance. This allows the
# pool to be gracefully stopped and to be monitored by the server thread. This
# monitoring involves reaping child processes that have died and reporting on
# errors raised by children. It is also possible to respawn dead child
# workers, but this should be thoroughly thought through (ha, unintentional
# alliteration) before doing so [if the CPU is thrashing, then respawning dead
# child workers will only contribute to the thrash].
module BeanstalkWorkerPool
  # Before we start the server run loop, allocate our pool of child workers
  # and prefork seven JobProcessors to pull work from the beanstalk queue.
  def before_starting
    @pool = Servolux::Prefork.new \
      :module => JobProcessor,
      :config => {:host => '127.0.0.1', :port => 11300}
    @pool.start 7
  end

  # This run loop will be called at a fixed interval by the server thread. If
  # the pool has any child processes that have died or restarted, then the
  # expired PIDs are read from the proc table. If any workers in the pool
  # have reported an error, then display those errors on STDOUT; these are
  # errors raised from the child process that caused the child to terminate.
  def run
    @pool.reap
    @pool.each_worker { |worker|
      $stdout.puts "[P] #{Process.pid} child error: #{worker.error.inspect}" if worker.error
    }
  end

  # After the server run loop exits, stop all children in the pool of workers.
  def after_stopping
    @pool.stop
  end
end

# See the beanstalk.rb example for an explanation of the JobProcessor
module JobProcessor
  def before_executing
    host = config[:host]
    port = config[:port]
    @beanstalk = Beanstalk::Pool.new(["#{host}:#{port}"])
  end

  def after_executing
    @beanstalk.close
  end

  def hup
    @beanstalk.close if @job.nil?
    @thread.wakeup
  end
  alias :term :hup

  def execute
    @job = nil
    @job = @beanstalk.reserve(120) rescue nil
    if @job
      $stdout.puts "[C] #{Process.pid} processing job #{@job.inspect}"
    end
  rescue Beanstalk::TimedOut
  ensure
    @job.delete rescue nil if @job
  end
end

