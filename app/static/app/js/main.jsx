import '../css/main.scss';
import './django/csrf';
import ReactDOM from 'react-dom';
import React from 'react';
import $ from 'jquery';
import PluginsAPI from './classes/plugins/API';
import { setLocale } from './translations/functions';

// Main is always executed first in the page

// Silence annoying React deprecation notice of useful functionality
const originalError = console.error;
console.error = function(...args) {
  let message = args[0];
  if (typeof message === 'string' && message.indexOf('Warning: A future version of React will block javascript:') !== -1) {
    return;
  }
  originalError.apply(console, args);
};

// We share some objects to avoid having to include them
// as a dependency in each component (adds too much space overhead)
window.ReactDOM = ReactDOM;
window.React = React;

// Expose set locale function globally
window.setLocale = setLocale;

$(function(){
    PluginsAPI.App.triggerReady();
});

