import '../css/main.scss';
import './django/csrf';
import ReactDOM from 'react-dom';
import React from 'react';
import PluginsAPI from './classes/plugins/API';

// Main is always executed first in the page

// We share some objects to avoid having to include them
// as a dependency in each component (adds too much space overhead)
window.ReactDOM = ReactDOM;
window.React = React;

