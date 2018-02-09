import '../css/main.scss';
import './django/csrf';
import ReactDOM from 'react-dom';
import PluginsAPI from './classes/plugins/API';

// Main is always executed first in the page

// We share the ReactDOM object to avoid having to include it
// as a dependency in each component (adds too much space overhead)
window.ReactDOM = ReactDOM;
