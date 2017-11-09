import React from 'react';
import '../css/SwitchModeButton.scss';
import PropTypes from 'prop-types';

class SwitchModeButton extends React.Component {
  static defaultProps = {
    task: null,
    type: "mapToModel"
  };

  static propTypes = {
    task: PropTypes.object, // The object should contain two keys: {id: <taskId>, project: <projectId>}
    type: PropTypes.string // Either "mapToModel" or "modelToMap"
  };

  constructor(props){
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.icon = this.icon.bind(this);
    this.text = this.text.bind(this);

  }

  handleClick(){
    if (this.props.task){
      const prefix = this.props.type === 'mapToModel' ? '3d' : 'map';
      location.href = `/${prefix}/project/${this.props.task.project}/task/${this.props.task.id}/`;
    }
  }

  icon(){
    return this.props.type === 'mapToModel' ? 'fa-cube' : 'fa-globe';
  }

  text(){
    return this.props.type === 'mapToModel' ? '3D' : '2D';
  }

  render() {
    return (
      <button 
        onClick={this.handleClick}
        type="button"
        className={"switchModeButton btn btn-sm btn-primary " + (!this.props.task ? "hide" : "")}>
        <i className={"fa " + (this.icon())}></i> {this.text()}
      </button>
    );
  }
}

export default SwitchModeButton;
