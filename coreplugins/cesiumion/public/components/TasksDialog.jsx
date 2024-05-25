import React, { Component, Fragment } from "react";
import IonAssetLabel from "./IonAssetLabel";
import "./TaskDialog.scss";

const TaskStatusItem = ({
    asset,
    progress,
    task,
    helpText = "",
    active = true,
    bsStyle = "primary"
}) => (
    <div className="list-group-item">
        <div className="row">
            <div className="col-xs-6">
                <p style={{ fontWeight: "bold" }}>
                    <IonAssetLabel asset={asset} showIcon={true} />
                </p>
            </div>
            <div className="col-xs-6">
                <p className={"pull-right"}>Status: {task}</p>
            </div>
        </div>
        <progress value={progress} max="100" className={bsStyle}></progress>
        {helpText && <small>{helpText}</small>}
    </div>
);

export default class TaskDialog extends Component {
    static defaultProps = {
        tasks: [],
        taskComponent: TaskStatusItem
    };

    render() {
        const {
            tasks,
            taskComponent: TaskComponent,
            onClearFailed,
            onHide,
            ...options
        } = this.props;

        let hasErrors = false;

        const taskItems = tasks.map(
            ({ type: asset, upload, process, error }) => {
                let task,
                    style,
                    active = true,
                    progress = 0;

                if (upload.active) {
                    progress = upload.progress;
                    task = "Uploading";
                    style = "info";
                } else if (process.active) {
                    progress = process.progress;
                    task = "Processing";
                    style = "success";
                }

                if (error.length > 0) {
                    task = "Error";
                    style = "danger";
                    active = false;
                    console.error(error);
                    hasErrors = true;
                }

                return (
                    <TaskStatusItem
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

        return (
            <div className={"modal ion-tasks"} style={{display: options.show ? 'block' : 'none'}}>
                <div className="modal-header">
                    <button type="button" className="close" onClick={onHide}>&times;</button>
                    <h4 className="modal-title">
                        <i className={"fa fa-cesium"} /> Cesium Ion Tasks
                    </h4>
                </div>
                <div className="modal-body">
                    <div className="list-group">{taskItems}</div>

                    {hasErrors && (
                        <button
                            className={"center-block btn btn-danger btn-sm"}
                            onClick={onClearFailed}
                        >
                            <i className="glyphicon glyphicon-trash"></i>
                            Remove Failed Tasks
                        </button>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={onHide}>
                        Close
                    </button>
                </div>
            </div>
        );
    }
}