## Serv-O-Lux
by Tim Pease [![](https://secure.travis-ci.org/TwP/servolux.png)](http://travis-ci.org/TwP/servolux)

* [Homepage](http://rubygems.org/gems/servolux)
* [Github Project](http://github.com/TwP/servolux)

### Description

Serv-O-Lux is a collection of Ruby classes that are useful for daemon and
process management, and for writing your own Ruby services. The code is well
documented and tested. It works with Ruby and JRuby supporting 1.9 and 2.0
interpreters.

### Features

[Servolux::Threaded](http://www.rubydoc.info/github/TwP/servolux/Servolux/Threaded)
-- when included into your own class, it gives you an activity thread that will
run some code at a regular interval. Provides methods to start and stop the
thread, report on the running state, and join the thread to wait for it to
complete.

[Servolux::Server](http://www.rubydoc.info/github/TwP/servolux/Servolux/Server)
-- a template server class that handles the mundane work of creating / deleting
a PID file, reporting running state, logging errors, starting the service, and
gracefully shutting down the service.

[Servolux::Piper](http://www.rubydoc.info/github/TwP/servolux/Servolux/Piper)
-- an extension of the standard Ruby fork method that opens a pipe for
communication between parent and child processes. Ruby objects are passed
between parent and child allowing, for example, exceptions in the child process
to be passed to the parent and raised there.

[Servolux::Daemon](http://www.rubydoc.info/github/TwP/servolux/Servolux/Daemon)
-- a robust class for starting and stopping daemon processes.

[Servolux::Child](http://www.rubydoc.info/github/TwP/servolux/Servolux/Child)
-- adds some much needed functionality to child processes created via Ruby's
IO#popen method. Specifically, a timeout thread is used to signal the child
process to die if it does not exit in a given amount of time.

[Servolux::Prefork](http://www.rubydoc.info/github/TwP/servolux/Servolux/Prefork)
-- provides a pre-forking worker pool for executing tasks in parallel using
multiple processes.

[Servolux::PidFile](http://www.rubydoc.info/github/TwP/servolux/Servolux/PidFile)
-- provides PID file management and process signaling and liveness checks.

All the documentation is available online at http://rdoc.info/projects/TwP/servolux

### Install

    gem install servolux

### License

The MIT License

Copyright (c) 2015 Tim Pease

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
