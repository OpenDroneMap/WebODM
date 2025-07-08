### `String#blank?` Ruby Extension

[![Gem Version](https://badge.fury.io/rb/fast_blank.png)](http://badge.fury.io/rb/fast_blank) [![Build Status](https://travis-ci.org/SamSaffron/fast_blank.png?branch=master)](https://travis-ci.org/SamSaffron/fast_blank)

`fast_blank` is a simple C extension which provides a fast implementation of [Active Support's `String#blank?` method](http://api.rubyonrails.org/classes/String.html#method-i-blank-3F).

### How do you use it?

    require 'fast_blank'

or add it to your Bundler Gemfile

    gem 'fast_blank'

### How fast is "Fast"?

About 1.2–20x faster than Active Support on my machine (your mileage my vary, depends on string length):

```
$ bundle exec ./benchmark

================== Test String Length: 0 ==================
Calculating -------------------------------------
          Fast Blank   225.251k i/100ms
  Fast ActiveSupport   225.676k i/100ms
          Slow Blank   110.934k i/100ms
      New Slow Blank   221.792k i/100ms
-------------------------------------------------
          Fast Blank     29.673M (± 2.7%) i/s -    148.215M
  Fast ActiveSupport     28.249M (± 3.5%) i/s -    141.048M
          Slow Blank      2.158M (± 3.3%) i/s -     10.872M
      New Slow Blank     23.558M (± 3.2%) i/s -    117.772M

Comparison:
          Fast Blank: 29673200.1 i/s
  Fast ActiveSupport: 28248894.5 i/s - 1.05x slower
      New Slow Blank: 23557900.0 i/s - 1.26x slower
          Slow Blank:  2157787.7 i/s - 13.75x slower


================== Test String Length: 6 ==================
Calculating -------------------------------------
          Fast Blank   201.185k i/100ms
  Fast ActiveSupport   205.076k i/100ms
          Slow Blank   102.061k i/100ms
      New Slow Blank   123.087k i/100ms
-------------------------------------------------
          Fast Blank     13.894M (± 2.3%) i/s -     69.409M
  Fast ActiveSupport     14.627M (± 3.5%) i/s -     73.212M
          Slow Blank      1.943M (± 2.3%) i/s -      9.798M
      New Slow Blank      2.796M (± 1.8%) i/s -     14.032M

Comparison:
  Fast ActiveSupport: 14627063.7 i/s
          Fast Blank: 13893631.2 i/s - 1.05x slower
      New Slow Blank:  2795783.3 i/s - 5.23x slower
          Slow Blank:  1943025.9 i/s - 7.53x slower


================== Test String Length: 14 ==================
Calculating -------------------------------------
          Fast Blank   220.004k i/100ms
  Fast ActiveSupport   219.716k i/100ms
          Slow Blank   147.399k i/100ms
      New Slow Blank   106.651k i/100ms
-------------------------------------------------
          Fast Blank     24.949M (± 3.0%) i/s -    124.742M
  Fast ActiveSupport     24.491M (± 3.3%) i/s -    122.382M
          Slow Blank      4.292M (± 1.6%) i/s -     21.520M
      New Slow Blank      2.115M (± 2.4%) i/s -     10.665M

Comparison:
          Fast Blank: 24948558.8 i/s
  Fast ActiveSupport: 24491245.1 i/s - 1.02x slower
          Slow Blank:  4292490.5 i/s - 5.81x slower
      New Slow Blank:  2115097.6 i/s - 11.80x slower


================== Test String Length: 24 ==================
Calculating -------------------------------------
          Fast Blank   206.555k i/100ms
  Fast ActiveSupport   208.513k i/100ms
          Slow Blank   137.733k i/100ms
      New Slow Blank   101.215k i/100ms
-------------------------------------------------
          Fast Blank     16.761M (± 2.7%) i/s -     83.861M
  Fast ActiveSupport     17.710M (± 3.2%) i/s -     88.618M
          Slow Blank      3.744M (± 2.0%) i/s -     18.732M
      New Slow Blank      1.962M (± 2.7%) i/s -      9.818M

Comparison:
  Fast ActiveSupport: 17709936.5 i/s
          Fast Blank: 16760839.7 i/s - 1.06x slower
          Slow Blank:  3744048.4 i/s - 4.73x slower
      New Slow Blank:  1961831.1 i/s - 9.03x slower


================== Test String Length: 136 ==================
Calculating -------------------------------------
          Fast Blank   201.772k i/100ms
  Fast ActiveSupport   189.120k i/100ms
          Slow Blank   129.439k i/100ms
      New Slow Blank    90.677k i/100ms
-------------------------------------------------
          Fast Blank     16.718M (± 2.8%) i/s -     83.534M
  Fast ActiveSupport     17.617M (± 3.6%) i/s -     87.941M
          Slow Blank      3.725M (± 3.0%) i/s -     18.639M
      New Slow Blank      1.940M (± 4.8%) i/s -      9.702M

Comparison:
  Fast ActiveSupport: 17616782.1 i/s
          Fast Blank: 16718307.8 i/s - 1.05x slower
          Slow Blank:  3725097.6 i/s - 4.73x slower
      New Slow Blank:  1940271.2 i/s - 9.08x slower


```

Additionally, this gem allocates no strings during the test, making it less of a GC burden.

### Compatibility note:

`fast_blank` supports MRI Ruby 1.9.3, 2.0, 2.1, and 2.2, as well as Rubinius 2.x. Earlier versions of MRI are untested.

`fast_blank` implements `String#blank?` as MRI would have implemented it, meaning it has 100% parity with `String#strip.length == 0`.

Active Support's version also considers Unicode spaces.  For example, `"\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000".blank?` is true in Active Support even though `fast_blank` would treat it as *not* blank.  Therefore, `fast_blank` also provides `blank_as?` which is a 100%-compatible Active Support `blank?` replacement.

### Credits

* Author: Sam Saffron (sam.saffron@gmail.com)
* https://github.com/SamSaffron/fast_blank
* License: MIT
* Gem template based on [CodeMonkeySteve/fast_xor](https://github.com/CodeMonkeySteve/fast_xor)

### Change log:

1.0.1:
  - Minor, avoid warnings if redefining blank?

1.0.0:
  - Adds Ruby 2.2 support ([@tjschuck](https://github.com/tjschuck) — [#9](https://github.com/SamSaffron/fast_blank/pull/9))

0.0.2:
  - Removed rake dependency ([@tmm1](https://github.com/tmm1) — [#2](https://github.com/SamSaffron/fast_blank/pull/2))
  - Unrolled internal loop to improve perf ([@tmm1](https://github.com/tmm1) — [#2](https://github.com/SamSaffron/fast_blank/pull/2))
