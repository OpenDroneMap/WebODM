import React from 'react';
import '../css/ShareButton.scss';
import SharePopup from './SharePopup';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

class ShareButton extends React.Component {
  static defaultProps = {
    task: null,
    popupPlacement: 'top'
  };
  static propTypes = {
    task: PropTypes.object.isRequired,
    linksTarget: PropTypes.oneOf(['map', '3d']).isRequired,
    popupPlacement: PropTypes.string
  }

  constructor(props){
    super(props);

    this.state = { 
      showPopup: false,
      task: props.task
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleTaskChanged = this.handleTaskChanged.bind(this);
  }

  handleClick(e){
    this.setState({ showPopup: !this.state.showPopup });
  }

  hidePopup(){
    this.setState({showPopup: false});
  }

  handleTaskChanged(task){
    this.setState({task});
  }

  render() {
    const popup = <SharePopup 
            task={this.state.task}
            taskChanged={this.handleTaskChanged}
            placement={this.props.popupPlacement}
            linksTarget={this.props.linksTarget}
          />;

    return (
      <div className="shareButton" onClick={e => { e.stopPropagation(); }}>
        {this.props.popupPlacement === 'top' && this.state.showPopup ? 
          popup : ""}
        <button 
          type="button"
          onClick={this.handleClick}
          className={"shareButton btn btn-sm " + (this.state.task.public ? "btn-primary" : "btn-secondary")}>
          <i className="fa fa-share-alt"></i> {_("Share")}
        </button>
        {this.props.popupPlacement === 'bottom' && this.state.showPopup ? 
          popup : ""}
      </div>
    );
  }
}

export default ShareButton;
