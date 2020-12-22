// Define certain DOM elements
// that are not defined in the jest environment

const currentScript = document.createElement('script');
currentScript.src = "http://bogus";

Object.defineProperty(document, 'currentScript', {
  value: currentScript
});

// local storage mock
global.localStorage = {
	_dict: {},
	getItem: (key) => global.localStorage._dict[key],
	setItem: (key, value) => global.localStorage._dict[key] = value
}

// Missing XMLHttpRequest methods
XMLHttpRequest.prototype.abort = () => {};

// Missing canvas methods
HTMLCanvasElement.prototype.getContext = () => null;

// Translation methods provided by Django
global.gettext = v => v;
global.interpolate = (v, opt) => v;
global.get_format = v => v;
