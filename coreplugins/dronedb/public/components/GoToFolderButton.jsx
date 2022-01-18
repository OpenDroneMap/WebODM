import React, { Component, Fragment } from "react";

import { Button } from "react-bootstrap";

import "./GoToFolderButton.scss";

export default class GoToFolderButton extends Component {
	static defaultProps = {
		ddbUrl: null,
	};

	handleClick = () => window.open(this.props.ddbUrl, '_blank');;

	render() {
		return (
			<Button
				bsStyle={"primary"}
				bsSize={"small"}
				onClick={this.handleClick}>
				<i className={"fas fa-database icon"} />
				Go To Dataset
			</Button>
		);
	}
}
