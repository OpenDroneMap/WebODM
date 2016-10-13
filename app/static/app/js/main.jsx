import '../css/main.scss';
import './django/csrf';
import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from './Dashboard';

ReactDOM.render(<Dashboard/>, document.getElementById('dashboard-app'));
