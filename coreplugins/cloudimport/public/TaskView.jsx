import React, { Component, Fragment } from "react";
import PropTypes from 'prop-types';

import GoToFolderButton from "./components/GoToFolderButton";
import $ from "jquery"; // Fixes a AMD module definition error due to webpack

export default class TaskView extends Component {
	static propTypes = {
		folderUrl: PropTypes.string.isRequired,
	}
	
	render() {
		const {
			folderUrl,
		} = this.props;
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
