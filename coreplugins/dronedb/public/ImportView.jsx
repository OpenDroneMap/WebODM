import React, { Component, Fragment } from "react";
import PropTypes from 'prop-types';

import ResizeModes from 'webodm/classes/ResizeModes';
import { Modal, Button } from "react-bootstrap";
import SelectUrlDialog from "./components/SelectUrlDialog";
import ErrorDialog from "./components/ErrorDialog";
import ConfigureNewTaskDialog from "./components/ConfigureNewTaskDialog";

import "./ImportView.scss";

export default class TaskView extends Component {
	
 	static propTypes = {
		projectId: PropTypes.number.isRequired,
		apiURL: PropTypes.string.isRequired,
		onNewTaskAdded: PropTypes.func.isRequired,
  	}
	
	state = {
		error: "",
		ddbRes: null,
		isDialogOpen: false
	};
	
	onHideDialog = () => this.setState({ ddbRes: null, taskId: null, isDialogOpen: false });
	onSelectDdbRes = res => {
		console.log("Result", res);
		this.setState({ ddbRes: res, isDialogOpen: false });
	}
	
	
	onSaveTask = taskInfo => {
		// Create task
		const formData = {
			name: taskInfo.name,
			options: taskInfo.options,
			processing_node:  taskInfo.selectedNode.id,
			auto_processing_node: taskInfo.selectedNode.key == "auto",
			partial: true
		};

		if (taskInfo.resizeMode === ResizeModes.YES) {
			formData.resize_to = taskInfo.resizeSize;
		}

		$.ajax({
				url: `/api/projects/${this.props.projectId}/tasks/`,
				contentType: 'application/json',
				data: JSON.stringify(formData),
				dataType: 'json',
				type: 'POST'
			}).done((task) => {
				$.ajax({
						url: `${this.props.apiURL}/projects/${this.props.projectId}/tasks/${task.id}/import`,
						contentType: 'application/json',
						data: JSON.stringify({ddb_url: this.state.ddbRes.url}),
						dataType: 'json',
						type: 'POST'
					}).done(() => {
						this.onHideDialog();
						this.props.onNewTaskAdded();
					}).fail(error => {
						this.onErrorInDialog("Failed to start importing.");
					});
			}).fail(() => {
				this.onErrorInDialog("Cannot create new task. Please try again later.");
			});
	}

	onErrorInDialog = msg => {
		this.setState({ error: msg });
		this.onHideDialog();
	};

	handleClick = () => {
		this.setState({ isDialogOpen: true });
	}

	render() {
		const {
			error,
			ddbRes,
			isDialogOpen
		} = this.state;
		return (
			<Fragment>
				{error ? <ErrorDialog errorMessage={error} /> : ""}				
				<Button
					bsStyle={"default"}
					bsSize={"small"}
					className={"platform-btn"}
					onClick={this.handleClick}>
						<i className={"ddb-icon fa-fw"} />
						DroneDB Import
				</Button>
				<SelectUrlDialog
						  show={isDialogOpen}						  
						  onHide={this.onHideDialog}
						  onSubmit={this.onSelectDdbRes}
						  apiURL={this.props.apiURL}
						/>		
				{ddbRes ? 							
					<ConfigureNewTaskDialog
						show={ddbRes !== null}
						ddbRes={ddbRes}					
						onHide={this.onHideDialog}
						onSaveTask={this.onSaveTask}
					/> : ""}
				
			</Fragment>		
					
		);
	}
}
