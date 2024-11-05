import React from "react";
import '../css/processingCard.scss';

class ProcessingCard extends React.Component{
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