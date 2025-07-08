require File.expand_path(File.dirname(__FILE__) + '/helper')

class MiniTest::Spec
  def assert_query_equal(expected, actual, namespace=nil)
    assert_equal expected.split('&').sort, Padrino::Utils.build_uri_query(actual, namespace).split('&').sort
  end
end

describe 'Padrino::Utils.build_uri_query' do
  it 'should do simple conversion' do
    assert_query_equal 'a=10', :a => 10
  end

  it 'should do cgi escaping' do
    assert_query_equal 'a%3Ab=c+d', 'a:b' => 'c d'
  end

  it 'should expand nested hashes' do
    assert_query_equal 'person%5Blogin%5D=seckar&person%5Bname%5D=Nicholas',
      :person => { :login => 'seckar', :name => 'Nicholas' }
  end

  it 'should expand deeply nested hashes' do
    assert_query_equal 'account%5Bperson%5D%5Bid%5D=20&person%5Bid%5D=10',
      { :account => { :person => { :id => 20 } }, :person => {:id => 10} }
  end

  it 'should accept arrays' do
    assert_query_equal 'person%5Bid%5D%5B%5D=10&person%5Bid%5D%5B%5D=20',
      :person => {:id => [10, 20]}
  end

  it 'should accept empty arrays' do
    assert_query_equal "person%5B%5D=",
      [],
      'person'
  end

  it 'should expand nested hashes' do
    assert_query_equal '',
      {}
    assert_query_equal 'a=1&b%5Bc%5D=3',
      { a: 1, b: { c: 3, d: {} } }
    assert_query_equal '',
      { a: {b: {c: {}}} }
    assert_query_equal 'b%5Bc%5D=false&b%5Be%5D=&b%5Bf%5D=&p=12',
      { p: 12, b: { c: false, e: nil, f: '' } }
    assert_query_equal 'b%5Bc%5D=3&b%5Bf%5D=',
      { b: { c: 3, k: {}, f: '' } }
    assert_query_equal 'b=3',
      {a: [], b: 3}
  end

  it 'should accept namespace for hashes' do
    assert_query_equal "user%5Bname%5D=Nakshay&user%5Bnationality%5D=Indian", 
      { name: 'Nakshay', nationality: 'Indian' },
      'user'
  end
end

describe 'Padrino::Utils.deep_dup' do
  it 'should recursively dup array' do
    array = [1, [2, 3]]
    dup = Padrino::Utils.deep_dup(array)
    dup[1][2] = 4
    assert_equal 2, array[1].size
    assert_equal 4, dup[1][2]
  end

  it 'should recursively dup hash' do
    hash = { :a => { :b => 'b' } }
    dup = Padrino::Utils.deep_dup(hash)
    dup[:a][:c] = 'c'
    refute_includes hash[:a], :c
    assert_equal 'c', dup[:a][:c]
  end

  it 'should recursively dup array with hash' do
    array = [1, { :a => 2, :b => 3 } ]
    dup = Padrino::Utils.deep_dup(array)
    dup[1][:c] = 4
    refute_includes array[1], :c
    assert_equal 4, dup[1][:c]
  end

  it 'should recursively dup hash with array' do
    hash = { :a => [1, 2] }
    dup = Padrino::Utils.deep_dup(hash)
    dup[:a][2] = 'c'
    assert_equal 2, hash[:a].size
    assert_equal 'c', dup[:a][2]
  end

  it 'should dup initial hash values' do
    zero_hash = Hash.new 0
    hash = { :a => zero_hash }
    dup = Padrino::Utils.deep_dup(hash)
    assert_equal 0, dup[:a][44]
  end

  it 'should properly dup objects' do
    object = Object.new
    dup = Padrino::Utils.deep_dup(object)
    dup.instance_variable_set(:@a, 1)
    assert !object.instance_variable_defined?(:@a)
    assert dup.instance_variable_defined?(:@a)
  end

  it 'should not double the frozen keys' do
    hash = { 'a'.freeze => 1 }
    dup = Padrino::Utils.deep_dup(hash)
    assert_equal 1, dup.keys.length
  end
end

describe 'Padrino::Utils.symbolize_keys' do
  it 'should symbolize string keys' do
    assert_equal({ :a  => 1, :b  => 2 }, Padrino::Utils.symbolize_keys('a' => 1, 'b' => 2))
  end

  it 'should not fail on non-symbolizable keys' do
    assert_equal({ Object => 1, true => 2 }, Padrino::Utils.symbolize_keys(Object => 1, true => 2))
  end
end
