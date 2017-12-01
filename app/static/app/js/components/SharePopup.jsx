import React from 'react';
import '../css/SharePopup.scss';
import PropTypes from 'prop-types';
import ErrorMessage from './ErrorMessage';

class SharePopup extends React.Component{
  static propTypes = {
    task: PropTypes.object.isRequired
  };
  static defaultProps = {
  };

  constructor(props){
    super(props);

    this.state = {
      task: props.task,
      togglingShare: false,
      error: ""
    };

    this.handleEnableSharing = this.handleEnableSharing.bind(this);
  }

  handleEnableSharing(e){
    const { task } = this.state;

    this.setState({togglingShare: true});

    return $.ajax({
        url: `/api/projects/${task.project}/tasks/${task.id}/`,
        contentType: 'application/json',
        data: JSON.stringify({
          public: e.target.checked
        }),
        dataType: 'json',
        type: 'PATCH'
      })
      .done((task) => {
        this.setState({task});
      })
      .fail(() => this.setState({error: "An error occurred. Check your connection and permissions."}))
      .always(() => {
        this.setState({togglingShare: false});
      });
  }

  render(){
    return (<div className="sharePopup popover top in">
      <div className="arrow"></div>
      <h3 className="popover-title theme-background-highlight">Share</h3>
      <div className="popover-content theme-secondary">
        <ErrorMessage bind={[this, 'error']} />
        <div className="checkbox">
          <label>
            {this.state.togglingShare ? 
              <i className="fa fa-refresh fa-spin fa-fw"></i>
            : ""}

            <input 
              className={this.state.togglingShare ? "hide" : ""}
              type="checkbox" 
              checked={this.state.task.public}
              onChange={this.handleEnableSharing}
               />
            Enable sharing
          </label>
        </div>

        {this.state.task.public ? 
          <div>A large<br/>bunch<br/>bunch<br/>bunch<br/>bunch<br/>bunch<br/></div>
        : ""}
      </div>
    </div>);
  }
}

export default SharePopup;