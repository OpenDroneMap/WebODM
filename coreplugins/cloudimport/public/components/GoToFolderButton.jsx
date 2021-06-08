import React, { Component, Fragment } from "react";

import { Button } from "react-bootstrap";

import "./GoToFolderButton.scss";

export default class GoToFolderButton extends Component {
	static defaultProps = {
		folderUrl: null,
	};

	handleClick = () => window.open(this.props.folderUrl, '_blank');;

	render() {
		return (
			<Button
				bsStyle={"primary"}
				bsSize={"small"}
				onClick={this.handleClick}
			>
				<i className={"fa fa-folder icon"} />
				Go To Import Folder
			</Button>
		);
	}
}
