contracts.ruby brings code contracts to the Ruby language.

Example:

```ruby
class Example
  include Contracts::Core
  C = Contracts

  Contract C::Num, C::Num => C::Num
  def add(a, b)
    a + b
  end
end
```

This documentation is [open source](https://github.com/egonSchiele/contracts.ruby/tree/master/features). If you find it incomplete or confusing, please [submit an issue](https://github.com/egonSchiele/contracts.ruby/issues), or, better yet, [a pull request](https://github.com/egonSchiele/contracts.ruby).
