import React from 'react';
import './css/Dashboard.scss';
import ProjectList from './components/ProjectList';

class Dashboard extends React.Component {
  render() {
    return (
      <ProjectList source="/api/projects/"/>
    );
  }
}

export default Dashboard;
