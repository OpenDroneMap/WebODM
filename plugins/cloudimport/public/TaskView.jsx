import React, { Component, Fragment } from "react";
import PropTypes from 'prop-types';

import GoToFolderButton from "./components/GoToFolderButton";

export default class TaskView extends Component {
	static propTypes = {
		task: PropTypes.object.isRequired,
		apiURL: PropTypes.string.isRequired,
  }
	
	state = {
		folderUrl: null,
	};
	
	componentDidMount() {
		$.getJSON(`${this.props.apiURL}/projects/${this.props.task.project}/tasks/${this.props.task.id}/checkforurl`)
				.done(data => {
					this.setState({folderUrl: data.folder_url});
				})
	}

	render() {
		const {
			folderUrl,
		} = this.state;
		return (
			<Fragment>
				{folderUrl ?
					<GoToFolderButton
						folderUrl={folderUrl}
					/>
				: ""}
			</Fragment>
		);
	}
}
