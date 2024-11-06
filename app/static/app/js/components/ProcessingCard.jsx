import React from "react";
import PropTypes from 'prop-types';
import '../css/processingCard.scss';

class ProcessingCard extends React.Component{
  static propTypes = {
    task_id: PropTypes.string.isRequired,
    project_id: PropTypes.number.isRequired
  }
  constructor (props){
    super(props);
    
    console.log("testeProcessingCard")
    this.state = {
      items: [],
      loading: true
    }
  }
  

  componentDidMount(){
    fetch('http://<webapp_ip>:<webapp_port>/api/projects/<project_id>/tasks/<task_id>/getProcess').then(response => response.json());
  }
  render(){
      return (
        <div className="card">
        <div className="loading-container">
          <h2 className="cardTitle"> Processamentos </h2>
          <div className="processando-item">
            <span>Soja...</span>
            <div className="spinner"></div>
          </div>
          <div className="processando-item">
            <span>Milho...</span>
            <div className="spinner"></div>
          </div>
          <div className="processando-item">
            <span>Boi...</span>
            <div className="spinner"></div>
          </div>
          <div className="processando-item">
            <span>Assim?...</span>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }
}

export default ProcessingCard;