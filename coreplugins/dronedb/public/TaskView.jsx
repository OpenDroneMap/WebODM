import React, { Component, Fragment } from "react";
import PropTypes from 'prop-types';

import GoToFolderButton from "./components/GoToFolderButton";
import $ from "jquery"; // Fixes a AMD module definition error due to webpack

export default class TaskView extends Component {
	static propTypes = {
		ddbUrl: PropTypes.string.isRequired,
	}
	
	render() {
		const {
			ddbUrl,
		} = this.props;
		return (
			<Fragment>
				{ddbUrl ? <GoToFolderButton ddbUrl={ddbUrl} /> : ""}
			</Fragment>
		);
	}
}
