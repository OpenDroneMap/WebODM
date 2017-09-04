module.exports = {
  roots: ["./app/static/app/js"],
  "moduleNameMapper": {
    "^.*\\.scss$": "./tests/mocks/empty.scss.js" // TODO: how to use an absolute path?
  }
};