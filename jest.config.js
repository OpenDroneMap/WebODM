module.exports = {
  roots: ["./app/static/app/js"],
  moduleNameMapper: {
    "^.*\\.s?css$": "<rootDir>/app/static/app/js/tests/mocks/empty.scss.js",
    "jquery": "<rootDir>/app/static/app/js/vendor/jquery-1.11.2.min.js",
    "SystemJS": "<rootDir>/app/static/app/js/tests/mocks/system.js",
    "ReactDOM": "react-dom"
  },
  setupFiles: ["<rootDir>/app/static/app/js/tests/setup/shims.js",
  				"<rootDir>/app/static/app/js/tests/setup/setupTests.js", 
  				"<rootDir>/app/static/app/js/tests/setup/browserMock.js"],
  testURL: "http://localhost:8000/"
};