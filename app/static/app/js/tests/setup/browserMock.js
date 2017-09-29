// Define certain DOM elements
// that are not defined in the JEST environment

const currentScript = document.createElement('script');
currentScript.src = "http://bogus";

Object.defineProperty(document, 'currentScript', {
  value: currentScript
});