import React from 'react';
import PropTypes from 'prop-types';
import ShareDialog from './ShareDialog';
import Storage from 'webodm/classes/Storage';
import ErrorMessage from 'webodm/components/ErrorMessage';
import $ from 'jquery';

export default class ShareButton extends React.Component{
    static defaultProps = {
        task: null,
        token: ""
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
        token: PropTypes.string.isRequired // OAM Token
    };

    constructor(props){
        super(props);

        this.state = {
            loading: true,
            taskInfo: {},
            error: ''
        };
    }

    componentDidMount(){
        this.updateTaskInfo(false);
    }

    updateTaskInfo = (showErrors) => {
        const { task } = this.props;
        return $.ajax({
                type: 'GET',
                url: `/api/plugins/openaerialmap/task/${task.id}/info`,
                contentType: 'application/json'
            }).done(taskInfo => {
                // Allow a user to specify a better name for the sensor
                // and remember it.
                let sensor = Storage.getItem("oam_sensor_pref_" + taskInfo.sensor);
                if (sensor) taskInfo.sensor = sensor;

                // Allow a user to change the default provider name
                let provider = Storage.getItem("oam_provider_pref");
                if (provider) taskInfo.provider = provider;

                this.setState({taskInfo, loading: false});
                if (taskInfo.error && showErrors) this.setState({error: taskInfo.error});
            }).fail(error => {
                this.setState({error: error.statusText, loading: false});
            });
    }

    componentWillUnmount(){
        if (this.monitorTimeout) clearTimeout(this.monitorTimeout);
    }

    handleClick = () => {
        const { taskInfo } = this.state;
        if (!taskInfo.shared){
            this.shareDialog.show();
        }else if (taskInfo.oam_upload_id){
            window.open(`https://map.openaerialmap.org/#/upload/status/${encodeURIComponent(taskInfo.oam_upload_id)}`, '_blank');
        }
    }

    shareToOAM = (formData) => {
        const { task } = this.props;

        const oamParams = {
          token: this.props.token,
          sensor: formData.sensor,
          acquisition_start: formData.startDate,
          acquisition_end: formData.endDate,
          title: formData.title,
          provider: formData.provider,
          tags: formData.tags
        };

        return $.ajax({
            url: `/api/plugins/openaerialmap/task/${task.id}/share`,
            contentType: 'application/json',
            data: JSON.stringify({
                oamParams: oamParams
            }),
            dataType: 'json',
            type: 'POST'
          }).done(taskInfo => {
            // Allow a user to associate the sensor name coming from the EXIF tags
            // to one that perhaps is more human readable.
            Storage.setItem("oam_sensor_pref_" + taskInfo.sensor, formData.sensor);
            Storage.setItem("oam_provider_pref", formData.provider);

            this.setState({taskInfo});
            this.monitorProgress();
          });
    }

    monitorProgress = () => {
        if (this.state.taskInfo.sharing){
            // Monitor progress
            this.monitorTimeout = setTimeout(() => {
                this.updateTaskInfo(true).always(this.monitorProgress);
            }, 5000);
        }
    }

    render(){
        const { loading, taskInfo, error } = this.state;

        const getButtonIcon = () => {
            if (loading || taskInfo.sharing) return "fa fa-circle-notch fa-spin fa-fw";
            else if (error) return "fa fa-exclamation-triangle";
            else return "fa oam-icon";
        };

        const getButtonLabel = () => {
            if (loading) return "";
            else if (taskInfo.sharing) return " Sharing...";
            else if (taskInfo.shared) return " View In OAM";
            else if (error) return " OAM Plugin Error";
            else return " Share To OAM";
        }

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
        }

        return result;
    }
}
