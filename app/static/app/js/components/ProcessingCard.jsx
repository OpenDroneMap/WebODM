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
    
    this.state = {
      items: [],
      loading: true
    }
  }
  

  componentDidMount(){
    this.timeToWait = setInterval(this.getProcess, 5000);
    this.getProcess();
  }

  getProcess = () => {
    const url = '/api/projects/' + this.props.project_id + '/tasks/'+ this.props.task_id +'/getProcess';
    fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Erro na requisição");
        }
        return response.json();
      })
      .then(data => {
        
        this.setState({
          items: data.filter(item => item.finishedOn == null)
        })
      })
      .catch(error => {
        console.error("Erro:", error);
      });
  }

  render(){

    const { items } = this.state;
    const translateTypes = {
      "weeds" : "Daninha"
    }
   
    if(items.length === 0){
      return null;
    }

    return (
      <div className="card">
        <div className="loading-container">
          <h2 className="cardTitle"> Processamentos </h2>
          {items.length > 0 ? (
            items.map((task, index) => (
              <div key={index} className="processando-item">
                <span>{index+1}. Processando {translateTypes[task.task_type] || task.task_type} </span>
                <div className="spinner"></div>
              </div>
            ))
          ) : (
            <div> nada aq </div>
          )}
        </div>
      </div>
    );
  }
}

export default ProcessingCard;