import React, { Component, Fragment } from "react";

import {
	Row,
	Col,
	Modal,
	Button,
	ListGroup,
	ListGroupItem,
	ProgressBar,
	Glyphicon
} from "react-bootstrap";

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
	<ListGroupItem>
		<Row>
			<Col xs={6}>
				<p style={{ fontWeight: "bold" }}>
					<IonAssetLabel asset={asset} showIcon={true} />
				</p>
			</Col>
			<Col xs={6}>
				<p className={"pull-right"}>Status: {task}</p>
			</Col>
		</Row>
		<ProgressBar active={active} now={progress} bsStyle={bsStyle} />
		{helpText && <small>{helpText}</small>}
	</ListGroupItem>
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
			<Modal className={"ion-tasks"} onHide={onHide} {...options}>
				<Modal.Header closeButton>
					<Modal.Title>
						<i className={"fa fa-cesium"} /> Cesium Ion Tasks
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<ListGroup>{taskItems}</ListGroup>

					{hasErrors && (
						<Button
							className={"center-block"}
							bsSize={"small"}
							bsStyle={"danger"}
							onClick={onClearFailed}
						>
							<Glyphicon
								style={{ marginRight: "0.5em" }}
								glyph={"trash"}
							/>
							Remove Failed Tasks
						</Button>
					)}
				</Modal.Body>

				<Modal.Footer>
					<Button bsStyle={"primary"} onClick={onHide}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}
