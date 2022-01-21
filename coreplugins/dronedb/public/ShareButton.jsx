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
    'fas fa-cloud fa-fw', 
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
    'Sharing...',
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
            intervalId: null
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
                this.setState({taskInfo});
                if (taskInfo.error && showErrors) this.setState({error: taskInfo.error});
            }).fail(error => {
                this.setState({error: error.statusText});
            });
    }
    
    componentWillUnmount(){
        if (this.intervalId) clearInterval(this.intervalId);
    }

    shareToDdb = (formData) => {
        const { task } = this.props;

        return $.ajax({
            url: `/api/plugins/dronedb/tasks/${task.id}/share`,
            contentType: 'application/json',
            //data: JSON.stringify({
            //    oamParams: oamParams
            //}),
            dataType: 'json',
            type: 'POST'
          }).done(taskInfo => {
            // Allow a user to associate the sensor name coming from the EXIF tags
            // to one that perhaps is more human readable.

            this.setState({taskInfo});
            
            if (this.state.intervalId) clearInterval(this.state.intervalId);

            this.state.intervalId = setInterval(() => {
                this.updateTaskInfo(true);

                if (this.state.error != null || this.state.taskInfo.status == STATE_DONE || this.state.taskInfo.status == STATE_ERROR) {
                    clearInterval(this.state.intervalId);
                }

            }, 3000);            

          });
    }


    handleClick = e => {

        if (this.state.taskInfo.status == STATE_IDLE){
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

            if (taskInfo == null) return "Share on DroneDB";
            if (taskInfo.error) return "DroneDB plugin error";

            return BUTTON_TEXT_MAPPER[taskInfo.status];
        };

        return (
            <div className="share-button">
                <button className="btn btn-primary btn-sm" onClick={this.handleClick} disabled={this.state.taskInfo == null || this.state.taskInfo.status == STATE_RUNNING }>
                    <i className={getButtonIcon()}></i>&nbsp;
                    {getButtonLabel()}
                </button>
            </div>
        );

        /*
        const result = [
                <ErrorMessage bind={[this, "error"]} />,
                <button
                onClick={this.handleClick}
                disabled={loading || taskInfo.sharing || error}
                className="btn btn-sm btn-primary">
                    {[<i className={getButtonIcon()}></i>, getButtonLabel()]}
                </button>];

        if (taskInfo.sensor !== undefined){
            result.unshift(<ShareDialog
                  ref={(domNode) => { this.shareDialog = domNode; }}
                  task={this.props.task}
                  taskInfo={taskInfo}
                  saveAction={this.shareToOAM}
                />);
        }*/

    }
}
