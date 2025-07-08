require "./lib/contracts"
require "benchmark"
require "rubygems"
require "method_profiler"
require "ruby-prof"
require "open-uri"

include Contracts

def download url
  open("http://www.#{url}/").read
end

Contract String => String
def contracts_download url
  open("http://www.#{url}").read
end

@urls = %w{google.com bing.com}

def benchmark
  Benchmark.bm 30 do |x|
    x.report "testing download" do
      100.times do |_|
        download(@urls.sample)
      end
    end
    x.report "testing contracts download" do
      100.times do |_|
        contracts_download(@urls.sample)
      end
    end
  end
end

def profile
  profilers = []
  profilers << MethodProfiler.observe(Contract)
  profilers << MethodProfiler.observe(Object)
  profilers << MethodProfiler.observe(Contracts::MethodDecorators)
  profilers << MethodProfiler.observe(Contracts::Decorator)
  profilers << MethodProfiler.observe(Contracts::Support)
  profilers << MethodProfiler.observe(UnboundMethod)
  10.times do |_|
    contracts_download(@urls.sample)
  end
  profilers.each { |p| puts p.report }
end

def ruby_prof
  RubyProf.start
  10.times do |_|
    contracts_download(@urls.sample)
  end
  result = RubyProf.stop
  printer = RubyProf::FlatPrinter.new(result)
  printer.print(STDOUT)
end

benchmark
profile
ruby_prof if ENV["FULL_BENCH"] # takes some time
