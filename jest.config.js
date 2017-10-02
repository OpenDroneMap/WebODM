module.exports = {
  roots: ["./app/static/app/js"],
  moduleNameMapper: {
    "^.*\\.s?css$": "<rootDir>/app/static/app/js/tests/mocks/empty.scss.js",
    "jquery": "<rootDir>/app/static/app/js/vendor/jquery-1.11.2.min.js"
  },
  setupFiles: ["<rootDir>/app/static/app/js/tests/setup/browserMock.js"]
};