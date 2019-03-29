import React from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import './ContoursPanel.scss';

export default class ContoursPanel extends React.Component {
  static defaultProps = {

  };
  static propTypes = {
    onClose: PropTypes.func.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: ""
    };

  }

  componentDidMount(){
  }

  componentWillUnmount(){
  }

    calculateVolume(){
            // $.ajax({
            //     type: 'POST',
            //     url: `/api/plugins/measure/task/${task.id}/volume`,
            //     data: JSON.stringify({'area': this.props.resultFeature.toGeoJSON()}),
            //     contentType: "application/json"
            // }).done(result => {
            //     if (result.volume){
            //         this.setState({volume: parseFloat(result.volume)});
            //     }else if (result.error){
            //         this.setState({error: result.error});
            //     }else{
            //         this.setState({error: "Invalid response: " + result});
            //     }
            // }).fail(error => {
            //     this.setState({error});
            // });
  }

  render(){
    const { error } = this.state;

    return (<div className="contours-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Contours</div>
    </div>);
  }
}