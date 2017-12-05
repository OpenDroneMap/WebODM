import React from 'react';
import '../css/SharePopup.scss';
import PropTypes from 'prop-types';
import ErrorMessage from './ErrorMessage';
import Utils from '../classes/Utils';
import ClipboardInput from './ClipboardInput';

class SharePopup extends React.Component{
  static propTypes = {
    task: PropTypes.object.isRequired,
    linksTarget: PropTypes.oneOf(['map', '3d']).isRequired,
    placement: PropTypes.string,
    taskChanged: PropTypes.func
  };
  static defaultProps = {
    placement: 'top',
    taskChanged: () => {}
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

  componentDidMount(){
    if (!this.state.task.public){
      this.handleEnableSharing();
    }
  }

  handleEnableSharing(e){
    const { task } = this.state;

    this.setState({togglingShare: true});

    return $.ajax({
        url: `/api/projects/${task.project}/tasks/${task.id}/`,
        contentType: 'application/json',
        data: JSON.stringify({
          public: !this.state.task.public
        }),
        dataType: 'json',
        type: 'PATCH'
      })
      .done((task) => {
        this.setState({task});
        this.props.taskChanged(task);
      })
      .fail(() => this.setState({error: "An error occurred. Check your connection and permissions."}))
      .always(() => {
        this.setState({togglingShare: false});
      });
  }

  render(){
    const shareLink = Utils.absoluteUrl(`/public/task/${this.state.task.id}/${this.props.linksTarget}/`);
    const iframeUrl = Utils.absoluteUrl(`public/task/${this.state.task.id}/iframe/${this.props.linksTarget}/`);
    const iframeCode = `<iframe scrolling="no" title="WebODM" width="61.8033%" height="360" frameBorder="0" src="${iframeUrl}"></iframe>`;

    return (<div onMouseDown={e => { e.stopPropagation(); }}
        className={"sharePopup popover in " + this.props.placement}>
      <div className="arrow"></div>
      <h3 className="popover-title theme-background-highlight">Share This Task</h3>
      <div className="popover-content theme-secondary">
        <ErrorMessage bind={[this, 'error']} />
        <div className="checkbox">
          <label onClick={this.handleEnableSharing}>
            {this.state.togglingShare ? 
              <i className="fa fa-refresh fa-spin fa-fw"></i>
            : ""}

            <input 
              className={this.state.togglingShare ? "hide" : ""}
              type="checkbox" 
              checked={this.state.task.public}
              onChange={() => {}}
               /> Enabled
          </label>
        </div>
        <div className={"share-links " + (this.state.task.public ? "show" : "")}>
          <div className="form-group">
            <label>
              Link:
              <ClipboardInput 
                type="text" 
                className="form-control" 
                value={shareLink} 
                readOnly={true} 
                />
            </label>
          </div>
          <div className="form-group">
            <label>
              HTML iframe:
              <ClipboardInput 
                type="text" 
                className="form-control" 
                value={iframeCode} 
                readOnly={true} 
                />
            </label>
          </div>
        </div>
      </div>
    </div>);
  }       
}

export default SharePopup;