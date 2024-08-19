import React from 'react';
import PropTypes from 'prop-types';
// import ErrorMessage from './ErrorMessage';
import IonAssetLabel from './IonAssetLabel';
import './TaskDialog.scss';
import $ from 'jquery';

const TaskStatusItem = ({
    asset,
    progress,
    task,
    helpText = '',
    active = true,
    bsStyle = 'primary'
}) => (
    <div className="list-group-item">
        <div className="row">
            <div className="col-xs-6">
                <p style={{ fontWeight: 'bold' }}>
                    <IonAssetLabel asset={asset} showIcon={true} />
                </p>
            </div>
            <div className="col-xs-6">
                <p className="pull-right">Status: {task}</p>
            </div>
        </div>
        <progress value={progress} max="100" className={bsStyle}></progress>
        {helpText && <small>{helpText}</small>}
    </div>
);

export default class TaskDialog extends React.Component {
    static defaultProps = {
        tasks: [],
        taskComponent: TaskStatusItem,
        show: false
    };

    static propTypes = {
        tasks: PropTypes.array.isRequired,
        taskComponent: PropTypes.elementType,
        onClearFailed: PropTypes.func.isRequired,
        onHide: PropTypes.func.isRequired,
        show: PropTypes.bool
    };

    constructor(props) {
        super(props);

        this.state = {
            showModal: props.show,
            error: ''
        };

        this.setModal = this.setModal.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
    }

    setModal(domNode) {
        this.modal = domNode;
    }

    componentDidMount() {
        this._mounted = true;

        $(this.modal)
            .on('hidden.bs.modal', () => {
                this.hide();
            })
            .on('shown.bs.modal', () => {
                if (this.props.onShow) this.props.onShow();
            });

        this.componentDidUpdate();
    }

    componentWillUnmount() {
        this._mounted = false;
        $(this.modal).off('hidden.bs.modal shown.bs.modal').modal('hide');
    }

    componentDidUpdate() {
        if (this.state.showModal) {
            $(this.modal).modal('show');
        } else {
            $(this.modal).modal('hide');
        }
    }

    show() {
        this.setState({ showModal: true, error: '' });
    }

    hide() {
        this.setState({ showModal: false });
        if (this.props.onHide) this.props.onHide();
    }

    renderTaskItems() {
        const { tasks, taskComponent: TaskComponent } = this.props;
        let hasErrors = false;

        const taskItems = tasks.map(
            ({ type: asset, upload, process, error }) => {
                let task,
                    style,
                    progress = 0;

                if (upload.active) {
                    progress = upload.progress;
                    task = 'Uploading';
                    style = 'info';
                } else if (process.active) {
                    progress = process.progress;
                    task = 'Processing';
                    style = 'success';
                }

                if (error.length > 0) {
                    task = 'Error';
                    style = 'danger';
                    console.error(error);
                    hasErrors = true;
                }

                return (
                    <TaskComponent
                        key={asset}
                        asset={asset}
                        progress={progress * 100}
                        task={task}
                        bsStyle={style}
                        helpText={error}
                    />
                );
            }
        );

        return { taskItems, hasErrors };
    }

    render() {
        const { onClearFailed } = this.props;
        const { taskItems, hasErrors } = this.renderTaskItems();

        return (
            <div ref={this.setModal} className="modal task-dialog" tabIndex="-1" data-backdrop="static">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" onClick={this.hide}>
                                <span>&times;</span>
                            </button>
                            <h4 className="modal-title">
                                <i className="fa fa-cesium" /> Cesium Ion Tasks
                            </h4>
                        </div>
                        <div className="modal-body">
                            {/* <ErrorMessage bind={[this, "error"]} /> */}
                            <div className="list-group">{taskItems}</div>

                            {hasErrors && (
                                <button
                                    className="center-block btn btn-danger btn-sm"
                                    onClick={onClearFailed}
                                >
                                    <i className="glyphicon glyphicon-trash"></i>
                                    Remove Failed Tasks
                                </button>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={this.hide}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}