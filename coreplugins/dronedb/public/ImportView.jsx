import React, { Component, Fragment } from "react";
import PropTypes from 'prop-types';

import ResizeModes from 'webodm/classes/ResizeModes';
import { Modal, Button } from "react-bootstrap";
import PlatformDialog from "./components/PlatformDialog";
import SelectUrlDialog from "./components/SelectUrlDialog";
import ErrorDialog from "./components/ErrorDialog";
import ConfigureNewTaskDialog from "./components/ConfigureNewTaskDialog";

import "./ImportView.scss";

export default class TaskView extends Component {

	/*
 	static propTypes = {
		projectId: PropTypes.number.isRequired,
		apiURL: PropTypes.string.isRequired,
		onNewTaskAdded: PropTypes.func.isRequired,
  	}*/
	
	state = {
		error: "",
		ddbUrl: "",
		selectedFolder: "",
		isDialogOpen: false
	};
	
	componentDidMount() {

		/* $.getJSON(`${this.props.apiURL}/platforms/`)
				.done(data => {
					this.setState({platforms: data.platforms});
				})
				.fail(() => {
					this.onErrorInDialog("Failed to find available platforms")
				}) */
				
	}

	//onSelectPlatform = platform => this.setState({ currentPlatform: platform });

	onHideDialog = () => this.setState({ ddbUrl: null, taskId: null, isDialogOpen: false });
	onSelectFolder = url => this.setState({ ddbUrl: url });
	/*
	onSelectFolder = folder => this.setState({ selectedFolder: folder });
	

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
						data: JSON.stringify({ddb_url: this.state.ddbUrl}),
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
	};*/

	handleClick = () => {
		this.setState({ isDialogOpen: true });
	}

	render() {
		const {
			error,
			ddbUrl,
			isDialogOpen
		} = this.state;
		return (
			<Fragment>
				{error ? <ErrorDialog errorMessage={error} /> : ""}				
				<Button
					id={"dronedbButton"}
					bsStyle={"default"}
					bsSize={"small"}
					className={"platform-btn"}
					onClick={this.handleClick}>
						<i className={"fas fa-cloud"} />
						DroneDB
				</Button>
				<SelectUrlDialog
						  show={isDialogOpen}						  
						  onHide={this.onHideDialog}
						  onSubmit={this.onSelectFolder}
						/>
			</Fragment>		
					
		);
	}
}
