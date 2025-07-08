## 0.3.0 / 2020-06-09

- Fix "undefined method `ascii_tree' for nil:NilClass" when printing parse error
- Fixes TOML to work with version 2.0 of Parslet

## 0.2.0 / 2017-11-11

- Add support for underscored Integers and Floats
- Fixes TOML to work with version 1.8.0 of Parslet

## 0.1.2 / 2014-10-16

- Add support for `CR` and `CRLF` newlines (#13)
- Add support for generating TOML from Ruby `Hash`es (#36)
- Add a script interface for @BurntSushi's `toml-test` utility (#38)

## 0.1.1 / 2014-02-17

- Add license to gemspec (#26)
- Loosen `multi_json` dependency version specified (#27)
- `Generator` should print empty hash tables but not keys without values (#28)
