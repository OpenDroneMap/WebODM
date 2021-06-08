import React, { PureComponent, Fragment } from "react";

import { DropdownButton, MenuItem } from "react-bootstrap";

import "./PlatformSelectButton.scss";

export default class PlatformSelectButton extends PureComponent {
	static defaultProps = {
		platforms: [],
		onSelect: () => {}
	};

	handleClick = platform => () => this.props.onSelect(platform);

	render() {
		const {
			platforms,
			onSelect,
		} = this.props;
		
		const menuItems = platforms
			.map(platform => (
				<MenuItem
					key={platform.name}
					tag={"a"}
					onClick={this.handleClick(platform)}
				>
					<Fragment>
						{"  "}
						{platform.name}
					</Fragment>
				</MenuItem>
			));

		const title = (
			<Fragment>
				<i className={"fa fa-cloud-download-alt fa-cloud-import"} />
				Cloud Import
			</Fragment>
		
		);

		return (
			<DropdownButton
				id={"platformsDropdown"}
				bsStyle={"default"}
				bsSize={"small"}
				className={"platform-btn"}
				title={title}
			>
				{menuItems}
			</DropdownButton>
		);
	}
}
