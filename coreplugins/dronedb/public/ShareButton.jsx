import React from 'react';
import PropTypes from 'prop-types';
import ErrorMessage from 'webodm/components/ErrorMessage';
import ShareDialog from './components/ShareDialog';
import $ from 'jquery';

const STATE_IDLE = 0;
const STATE_RUNNING = 1;
const STATE_ERROR = 2;
const STATE_DONE = 3;

const DRONEDB_ASSETS = [
    'orthophoto.tif',
    'orthophoto.png',
    'georeferenced_model.laz',
    'dtm.tif',
    'dsm.tif',
    'shots.geojson',
    'report.pdf',
    'ground_control_points.geojson'
];

const ICON_CLASS_MAPPER = [
    'ddb-icon fa-fw',                    // Idle
    'fa fa-circle-notch fa-spin fa-fw',  // Running
    'fa fa-exclamation-triangle',        // Error
    'fas fa-external-link-alt'           // Done
];

const BUTTON_TEXT_MAPPER = [
    'Share to DroneDB',  // Idle
    'Sharing',           // Running
    'Error, retry',      // Error
    'View on DroneDB'    // Done
];

export default class ShareButton extends React.Component {
    static defaultProps = {
        task: null
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            taskInfo: null,
            error: '',
            monitorTimeout: null,
            showDialog: false,
            filesToShare: []
        };
    }

    componentDidMount() {
        this.updateTaskInfo(false);
    }

    componentWillUnmount() {
        if (this.monitorTimeout) clearTimeout(this.monitorTimeout);
    }

    updateTaskInfo = (showErrors) => {
        const { task } = this.props;
        return $.ajax({
            type: 'GET',
            url: `/api/plugins/dronedb/tasks/${task.id}/status`,
            contentType: 'application/json'
        }).done(taskInfo => {
            this.setState({ taskInfo });
            if (taskInfo.error && showErrors) this.setState({ error: taskInfo.error });
        }).fail(error => {
            this.setState({ error: error.statusText });
        });
    };

    getFilesToShare() {
        const { task } = this.props;
        const availableAssets = task.available_assets || [];

        // Filter assets that can be shared
        const files = availableAssets
            .filter(asset => DRONEDB_ASSETS.includes(asset))
            .map(asset => ({
                name: asset,
                size: 0  // Size will be determined server-side
            }));

        // Add texture files indicator if available
        if (availableAssets.includes('textured_model.zip')) {
            files.push({
                name: 'textured_model/*',
                size: 0
            });
        }

        return files;
    }

    shareToDdb = (options = {}) => {
        const { task } = this.props;
        const { tag, datasetName } = options;

        this.setState({ showDialog: false });

        return $.ajax({
            url: `/api/plugins/dronedb/tasks/${task.id}/share`,
            contentType: 'application/json',
            data: JSON.stringify({ tag, datasetName }),
            dataType: 'json',
            type: 'POST'
        }).done(taskInfo => {
            this.setState({ taskInfo });
            this.monitorProgress();
        }).fail(error => {
            this.setState({
                error: error.responseJSON?.error || 'Failed to start sharing',
                taskInfo: { ...this.state.taskInfo, status: STATE_ERROR }
            });
        });
    };

    monitorProgress = () => {
        if (this.state.taskInfo?.status === STATE_RUNNING) {
            this.monitorTimeout = setTimeout(() => {
                this.updateTaskInfo(true).always(this.monitorProgress);
            }, 3000);
        }
    };

    handleClick = () => {
        const { taskInfo } = this.state;

        if (taskInfo?.status === STATE_IDLE || taskInfo?.status === STATE_ERROR) {
            // Open dialog to select destination
            const filesToShare = this.getFilesToShare();
            this.setState({ showDialog: true, filesToShare });
        }

        if (taskInfo?.status === STATE_DONE) {
            window.open(taskInfo.shareUrl, '_blank');
        }
    };

    handleDialogHide = () => {
        this.setState({ showDialog: false });
    };

    handleShare = (options) => {
        this.shareToDdb(options);
    };

    render() {
        const { task } = this.props;
        const { taskInfo, error, showDialog, filesToShare } = this.state;

        const getButtonIcon = () => {
            if (taskInfo == null) return "fa fa-circle-notch fa-spin fa-fw";
            if (taskInfo.error) return "fa fa-exclamation-triangle";
            return ICON_CLASS_MAPPER[taskInfo.status];
        };

        const getButtonLabel = () => {
            if (taskInfo == null) return "Share to DroneDB";
            if (taskInfo.error) return "DroneDB plugin error";

            let text = BUTTON_TEXT_MAPPER[taskInfo.status];

            if (taskInfo.status === STATE_RUNNING && taskInfo.uploadedSize > 0 && taskInfo.totalSize > 0) {
                const progress = (taskInfo.uploadedSize / taskInfo.totalSize) * 100;
                text += ` (${progress.toFixed(2)}%)`;
            }

            return text;
        };

        return (
            <div className="share-button">
                <button
                    className="btn btn-primary btn-sm"
                    onClick={this.handleClick}
                    disabled={taskInfo == null || taskInfo.status === STATE_RUNNING}
                >
                    <i className={getButtonIcon()}></i>&nbsp;
                    {getButtonLabel()}
                </button>

                {error && (
                    <div style={{ marginTop: '10px' }}>
                        <ErrorMessage bind={[this, 'error']} />
                    </div>
                )}

                <ShareDialog
                    show={showDialog}
                    onHide={this.handleDialogHide}
                    onShare={this.handleShare}
                    apiURL="/api/plugins/dronedb"
                    taskName={task.name}
                    filesToShare={filesToShare}
                />
            </div>
        );
    }
}
