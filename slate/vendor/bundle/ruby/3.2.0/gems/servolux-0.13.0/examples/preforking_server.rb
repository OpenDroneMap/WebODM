require 'rubygems'
require 'servolux'
require 'logger'

###############################################################################
# This is an example script that creates uses both Prefork and Server
#
# The Server will manage the Prefork pool and respond to signals to add new
# workers to the pool
###############################################################################

# The child script that will be executed, this is just a shell script that
# will be execed by each worker pool member.
module ExecChild
  def self.the_script
    <<__sh__
#!/bin/sh
#
trap "echo I am process $$" SIGUSR1
trap "exit 0" SIGHUP
trap "exit 1" SIGTERM

echo "[$$] I am a child program"
while true
do
  sleep 1
done
__sh__
  end

  def self.script_name
    "/tmp/exec-child-worker.sh"
  end

  def self.write_script
    File.open( script_name, "w+", 0750 ) do |f|
      f.write( the_script )
    end
  end

  def self.remove_script
    File.unlink( script_name )
  end

  def execute
    exec ExecChild.script_name
  end
end

class PreforkingServerExample < ::Servolux::Server

  # Create a preforking server that has the given minimum and maximum boundaries
  #
  def initialize( min_workers = 2, max_workers = 10 )
    @logger = ::Logger.new( $stderr )
    super( self.class.name, :interval => 2, :logger => @logger )
    @pool = Servolux::Prefork.new( :module => ExecChild, :timeout => nil,
                                   :min_workers => min_workers, :max_workers => max_workers )
  end

  def log( msg )
    logger.info msg
  end

  def log_pool_status
    log "Pool status : #{@pool.worker_counts.inspect} living pids #{live_worker_pids.join(' ')}"
  end

  def live_worker_pids
    pids = []
    @pool.each_worker { |w| pids << w.pid if w.alive? }
    return pids
  end

  def shutdown_workers
    log "Shutting down all workers"
    @pool.stop
    loop do
      log_pool_status
      break if @pool.live_worker_count <= 0
      sleep 0.25
    end
  end

  def log_worker_status( worker )
    if not worker.alive? then
      worker.wait
      if worker.exited? then
        log "Worker #{worker.pid} exited with status #{worker.exitstatus}"
      elsif worker.signaled? then
        log "Worker #{worker.pid} signaled by #{worker.termsig}"
      elsif worker.stopped? then
        log "Worker #{worker.pid} stopped by #{worker.stopsig}"
      else
        log "I have no clue #{worker.inspect}"
      end
    end
  end


  #############################################################################
  # Implementations of parts of the Servolux::Server API
  #############################################################################

  # this is run once before the Server's run loop
  def before_starting
    ExecChild.write_script
    log "Starting up the Pool"
    @pool.start( 1 )
    log "Send a USR1 to add a worker                        (kill -usr1 #{Process.pid})"
    log "Send a USR2 to kill all the workers                (kill -usr2 #{Process.pid})"
    log "Send a INT (Ctrl-C) or TERM to shutdown the server (kill -term #{Process.pid})"
  end

  # Add a worker to the pool when USR1 is received
  def usr1
    log "Adding a worker"
    @pool.add_workers
  end

  # kill all the current workers with a usr2, the run loop will respawn up to
  # the min_worker count
  #
  def usr2
    shutdown_workers
  end

  # By default, Servolux::Server will capture the TERM signal and call its
  # +shutdown+ method. After that +shutdown+ method is called it will call
  # +after_shutdown+ we're going to hook into that so that all the workers get
  # cleanly shutdown before the parent process exits
  def after_stopping
    shutdown_workers
    ExecChild.remove_script
  end

  # This is the method that is executed during the run loop
  #
  def run
    log_pool_status
    @pool.each_worker do |worker|
      log_worker_status( worker )
    end
    @pool.ensure_worker_pool_size
  end
end

if $0 == __FILE__ then
  pse = PreforkingServerExample.new
  pse.startup
end
