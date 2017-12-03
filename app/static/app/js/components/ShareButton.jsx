import React from 'react';
import '../css/ShareButton.scss';
import SharePopup from './SharePopup';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ShareButton extends React.Component {
  static defaultProps = {
    task: null,
  };
  static propTypes = {
    task: PropTypes.object.isRequired
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

  handleClick(){
    this.setState({ showPopup: !this.state.showPopup });
  }

  hidePopup(){
    this.setState({showPopup: false});
  }

  handleTaskChanged(task){
    this.setState({task});
  }

  render() {
    return (
      <div className="shareButton" onClick={e => { e.stopPropagation(); }}>
        {this.state.showPopup ? 
          <SharePopup 
            task={this.state.task}
            taskChanged={this.handleTaskChanged}
          />
        : ""}
        <button 
          ref={(domNode) => { this.shareButton = domNode; }}
          type="button"
          onClick={this.handleClick}
          className={"shareButton btn btn-sm " + (this.state.task.public ? "btn-primary" : "btn-secondary")}>
          <i className="fa fa-share-alt"></i> Share
        </button>
      </div>
    );
  }
}

export default ShareButton;
