import React from 'react';
import '../css/Standby.scss';
import PropTypes from 'prop-types';

class Standby extends React.Component {
  static defaultProps = {
      message: "",
      show: false,
      progress: null,
      opacity: 0.5
  };

  static propTypes = {
    message: PropTypes.string,
    show: PropTypes.bool,
    opacity: PropTypes.number
  };

  constructor(props){
    super(props);

    this.state = {
        message: props.message,
        show: props.show,
        progress: props.progress
    };
  }

  componentWillReceiveProps(nextProps){
    this.setState(nextProps);
  }

  show(message = null){
    this.setState({show: true});
    if (message){
      this.setState({message: message});
    }
  }

  hide(){
    this.setState({show: false});
  }

  render() {
    return (
      <div className="standby"
         style={{display: this.state.show ? "block" : "none"}}>
      <div className="cover" style={{opacity: this.props.opacity}}>&nbsp;</div>
      <div className="content">
        {this.state.progress !== null ? (
          <div className="standby-progress">
            <div className="standby-bar" style={{
              width: `${this.state.progress}%`,
            }}></div>
          </div>
          ) :
          <i className="fa fa-spinner fa-spin fa-2x fa-fw"></i>
        }
        <p>{this.state.message}</p>
      </div>
      </div>
    );
  }
}

export default Standby;
