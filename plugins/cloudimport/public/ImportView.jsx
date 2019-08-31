import React, { Component, Fragment } from "react";
import PropTypes from 'prop-types';

import ResizeModes from 'webodm/classes/ResizeModes';

import PlatformSelectButton from "./components/PlatformSelectButton";
import PlatformDialog from "./components/PlatformDialog";
import LibraryDialog from "./components/LibraryDialog";
import ErrorDialog from "./components/ErrorDialog";
import ConfigureNewTaskDialog from "./components/ConfigureNewTaskDialog";

export default class TaskView extends Component {
	static propTypes = {
		projectId: PropTypes.number.isRequired,
		apiURL: PropTypes.string.isRequired,
		onNewTaskAdded: PropTypes.func.isRequired,
  }
	
	state = {
		error: "",
		currentPlatform: null,
		selectedFolder: null,
		platforms: [],
	};
	
	componentDidMount() {
		$.getJSON(`${this.props.apiURL}/platforms/`)
				.done(data => {
					this.setState({platforms: data.platforms});
				})
				.fail(() => {
					this.onErrorInDialog("Failed to find available platforms")
				})
	}

	onSelectPlatform = platform => this.setState({ currentPlatform: platform });
	onSelectFolder = folder => this.setState({ selectedFolder: folder });
	onHideDialog = () => this.setState({ currentPlatform: null, selectedFolder: null, taskId: null });

	onSaveTask = taskInfo => {
		// Create task
		const formData = {
				name: taskInfo.name,
				options: taskInfo.options,
				processing_node:  taskInfo.selectedNode.id,
				auto_processing_node: taskInfo.selectedNode.key == "auto",
				partial: true
		};

		if (taskInfo.resizeMode === ResizeModes.YES){
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
						data: JSON.stringify({platform: this.state.currentPlatform.name, selectedFolderUrl: this.state.selectedFolder.url}),
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

	render() {
		const {
			currentPlatform,
			error,
			selectedFolder,
			platforms,
		} = this.state;
		return (
			<Fragment>
			{error ?
				<ErrorDialog errorMessage={error} />
			: ""}
				<PlatformSelectButton
					platforms={platforms}
					onSelect={this.onSelectPlatform}
				/>
				{selectedFolder === null ?
					<Fragment>
						<PlatformDialog
							show={selectedFolder === null}
							platform={currentPlatform}
							apiURL={this.props.apiURL}
							onHide={this.onHideDialog}
							onSubmit={this.onSelectFolder}
						/>
						<LibraryDialog
						  show={selectedFolder === null}
						  platform={currentPlatform}
							apiURL={this.props.apiURL}
						  onHide={this.onHideDialog}
						  onSubmit={this.onSelectFolder}
						/>
					</Fragment>
				: 
					<ConfigureNewTaskDialog
					  show={selectedFolder !== null}
						folder={selectedFolder}
					  platform={currentPlatform}
					  onHide={this.onHideDialog}
					  onSaveTask={this.onSaveTask}
					/>
				}
			</Fragment>
		);
	}
}
