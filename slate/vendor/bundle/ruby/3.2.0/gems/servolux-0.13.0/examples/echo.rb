# Pre-forking echo server using Servolux
#
# Run this code using "ruby echo.rb"
#
# You can test the server using NetCat from a separate terminal window.
#
#    echo "hello world" | nc localhost 4242
#
# This example was stolen from Ryan Tomayko and modified to demonstrate the
# Servolux gem. The original can be found here:
#
# http://tomayko.com/writings/unicorn-is-unix
# --------

require 'servolux'

# Create a socket, bind it to localhost:4242, and start listening.
# Runs once in the parent; all forked children inherit the socket's
# file descriptor.
acceptor = Socket.new(Socket::AF_INET, Socket::SOCK_STREAM, 0)
address = Socket.pack_sockaddr_in(4242, '0.0.0.0')
acceptor.bind(address)
acceptor.listen(10)

# Close the socket when we exit the parent or any child process. This
# only closes the file descriptor in the calling process, it does not
# take the socket out of the listening state (until the last fd is
# closed).
#
# The trap is guaranteed to happen, and guaranteed to happen only
# once, right before the process exits for any reason (unless
# it's terminated with a SIGKILL).
trap('EXIT') { acceptor.close }

# Create the worker pool passing in the code to execute in each child
# process.
pool = Servolux::Prefork.new {
  socket,_ = acceptor.accept
  socket.write "child #$$ echo> "
  socket.flush
  message = socket.gets
  socket.write message
  socket.close
  puts "child #$$ echo'd: '#{message.strip}'"
}

# Start up 3 child process to handle echo requests on the socket.
pool.start 3

# Stop the child processes when SIGINT is received.
trap('INT') { pool.signal 'KILL' }
Process.waitall
