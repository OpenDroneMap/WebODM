require 'spec_helper'
require 'parslet/rig/rspec'

describe 'rspec integration' do
  include Parslet
  subject { str('example') }

  it { should parse('example') }
  it { should_not parse('foo') }
  it { should parse('example').as('example') }
  it { should_not parse('foo').as('example') }
  it { should_not parse('example').as('foo') }

  it { str('foo').as(:bar).should parse('foo').as({:bar => 'foo'}) }
  it { str('foo').as(:bar).should_not parse('foo').as({:b => 'f'}) }

  it 'accepts a block to assert more specific details about the parsing output' do
    str('foo').as(:bar).should(parse('foo').as { |output|
      output.should have_key(:bar)
      output.values.first.should == 'foo'
    })
  end

  # Uncomment to test error messages manually: 
  # it { str('foo').should parse('foo', :trace => true).as('bar') }
  # it { str('foo').should parse('food', :trace => true) }
  # it { str('foo').should_not parse('foo', :trace => true).as('foo') }
  # it { str('foo').should_not parse('foo', :trace => true) }
  # it 'accepts a block to assert more specific details about the parsing output' do
  #   str('foo').as(:bar).should(parse('foo', :trace => true).as { |output|
  #     output.should_not have_key(:bar)
  #   })
  # end
  
end

describe 'rspec3 syntax' do
  include Parslet

  let(:s) { str('example') }

  it { expect(s).to parse('example') }
  it { expect(s).not_to parse('foo') }
  it { expect(s).to parse('example').as('example') }
  it { expect(s).not_to parse('foo').as('example') }

  it { expect(s).not_to parse('example').as('foo') }

  # Uncomment to test error messages manually: 
  # it { expect(str('foo')).to parse('foo', :trace => true).as('bar') }
  # it { expect(str('foo')).to parse('food', :trace => true) }
  # it { expect(str('foo')).not_to parse('foo', :trace => true).as('foo') }
  # it { expect(str('foo')).not_to parse('foo', :trace => true) }
end
