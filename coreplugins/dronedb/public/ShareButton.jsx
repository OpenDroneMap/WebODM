import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import ErrorMessage from 'webodm/components/ErrorMessage';
import $ from 'jquery';

const STATE_IDLE = 0;
const STATE_RUNNING = 1;
const STATE_ERROR = 2;
const STATE_DONE = 3;

const ICON_CLASS_MAPPER = [
    // Idle
    'ddb-icon fa-fw', 
    // Running
    'fa fa-circle-notch fa-spin fa-fw', 
    // Error
    'fa fa-exclamation-triangle', 
    // Done
    'fas fa-external-link-alt'
];

const BUTTON_TEXT_MAPPER = [
    // Idle
    'Share to DroneDB',
    // Running
    'Sharing',
    // Error retry
    'Error, retry',
    // Done
    'View on DroneDB'
];

export default class ShareButton extends React.Component{
    static defaultProps = {
        task: null
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
    };

    constructor(props){
        super(props);

        this.state = {            
            taskInfo: null,
            error: '',
            monitorTimeout: null
        };

    }
    
    componentDidMount(){
        this.updateTaskInfo(false);
    }

    updateTaskInfo = (showErrors) => {
        const { task } = this.props;
        return $.ajax({
                type: 'GET',
                url: `/api/plugins/dronedb/tasks/${task.id}/status`,
                contentType: 'application/json'
            }).done(taskInfo => {            
                console.log(taskInfo);  
                debugger;  
                this.setState({taskInfo});
                if (taskInfo.error && showErrors) this.setState({error: taskInfo.error});
            }).fail(error => {
                this.setState({error: error.statusText});
            });
    }

    componentWillUnmount(){
        if (this.monitorTimeout) clearTimeout(this.monitorTimeout);
    }

    shareToDdb = (formData) => {
        const { task } = this.props;

        return $.ajax({
            url: `/api/plugins/dronedb/tasks/${task.id}/share`,
            contentType: 'application/json',
            dataType: 'json',
            type: 'POST'
          }).done(taskInfo => {

            this.setState({taskInfo});
            this.monitorProgress();

          });
    }

    monitorProgress = () => {
        if (this.state.taskInfo.status == STATE_RUNNING){
            // Monitor progress
            this.monitorTimeout = setTimeout(() => {
                this.updateTaskInfo(true).always(this.monitorProgress);
            }, 3000);
        }
    }

    handleClick = e => {

        if (this.state.taskInfo.status == STATE_IDLE || this.state.taskInfo.status == STATE_ERROR) {
            this.shareToDdb();
        }

        if (this.state.taskInfo.status == STATE_DONE){
            window.open(this.state.taskInfo.shareUrl, '_blank');
        }

    }


    render(){
        const { taskInfo, error } = this.state;

        const getButtonIcon = () => {

            if (taskInfo == null) return "fa fa-circle-notch fa-spin fa-fw";            
            if (taskInfo.error) return "fa fa-exclamation-triangle";
            
            return ICON_CLASS_MAPPER[taskInfo.status];
        };

        const getButtonLabel = () => {

            if (taskInfo == null) return "Share to DroneDB";
            if (taskInfo.error) return "DroneDB plugin error";

            var text = BUTTON_TEXT_MAPPER[taskInfo.status];

            if (taskInfo.status == STATE_RUNNING && taskInfo.uploadedSize > 0 && taskInfo.totalSize > 0) {
                var progress = (taskInfo.uploadedSize / taskInfo.totalSize) * 100;
                text += ` (${progress.toFixed(2)}%)`;
            }

            return text;
        };

        return (
            <div className="share-button">
                <button className="btn btn-primary btn-sm" onClick={this.handleClick} disabled={this.state.taskInfo == null || this.state.taskInfo.status == STATE_RUNNING }>
                    <i className={getButtonIcon()}></i>&nbsp;
                    {getButtonLabel()}
                </button>
                {this.state.error && <div style={{ marginTop: '10px' }}><ErrorMessage bind={[this, 'error']} /></div> }
            </div>
        );
    }
}
