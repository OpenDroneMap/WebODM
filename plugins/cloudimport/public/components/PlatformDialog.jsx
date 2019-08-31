import PropTypes from 'prop-types';
import { Component } from "react";
import { Modal, Button, FormGroup, ControlLabel, FormControl, HelpBlock } from "react-bootstrap";
import "./PlatformDialog.scss";

export default class PlatformDialog extends Component {
	static defaultProps = {
		platform: null,
	};
	static propTypes = {
		onHide: PropTypes.func.isRequired,
		onSubmit: PropTypes.func.isRequired,
		platform: PropTypes.object,
		apiURL: PropTypes.string.isRequired,
  }

  constructor(props){
    super(props);

    this.state = {
				folderUrl: "",
        fetchedFolder: null,
				fetching: false,
    };
  }
	
	handleChange = e => {
		this.setState({folderUrl: e.target.value});
		this.verifyFolderUrl(e.target.value);
	}
	handleSubmit = e => this.props.onSubmit(this.state.fetchedFolder);

	verifyFolderUrl = (folderUrl) => {
		if (this.props.platform == null) {
			this.setState({fetching: false, fetchedFolder: null});
		} else {
			this.setState({fetching: true});
			$.getJSON(`${this.props.apiURL}/platforms/${this.props.platform.name}/verify`, {folderUrl: folderUrl})
					.done(data => this.setState({fetching: false, fetchedFolder: data.folder}))
					.fail(() => this.setState({fetching: false, fetchedFolder: null}))
		}
	}
	
	getValidationState = () => {
		if (this.state.folderUrl === "" || this.state.fetching === true) {
			return null;
		} else if (this.state.fetchedFolder == null){
			return "error";
		} else {
			return "success";
		}
	}
	
	render() {
		const {
			onHide,
			platform,
		} = this.props;

		const title = "Import from " + (platform !== null ? platform.name : "Platform");
		const isVisible = platform !== null && platform.type === "platform";
		return (
			<Modal className={"folder-select"} onHide={onHide} show={isVisible}>
				<Modal.Header closeButton>
					<Modal.Title>
						{title}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<form>
						<FormGroup controlId="folderUrl" validationState={this.getValidationState()}>
							<ControlLabel>Folder/Album URL</ControlLabel>
							<FormControl
								type="url"
								placeholder={platform !== null ? platform.folder_url_example : "Enter a folder url"}
								onChange={this.handleChange}
							/>
							<FormControl.Feedback />
							<HelpBlock>Please enter a valid folder/album URL. We will import all images from that folder.</HelpBlock>
						</FormGroup>
					</form>
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={onHide}>Close</Button>
					<Button
						bsStyle="primary"
						disabled={this.state.fetchedFolder === null}
						onClick={this.handleSubmit}
					>
						<i className={"fa fa-upload"} />
						Import
					</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}
