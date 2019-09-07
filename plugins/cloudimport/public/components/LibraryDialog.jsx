import PropTypes from 'prop-types';
import { Component } from "react";
import { Modal, Button } from "react-bootstrap";
import Select from 'react-select';
import "./LibraryDialog.scss";

export default class LibraryDialog extends Component {
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
				availableFolders: [],
				selectedFolder: null,
				loadingFolders: true,
				error: "",
    };
  }
	
	componentDidUpdate(){
    if (this.props.platform !== null && this.props.platform.type == "library" && this.state.loadingFolders){
	    $.get(`${this.props.apiURL}/cloudlibrary/${this.props.platform.name}/listfolders`)
	    .done(result => {
	      result.folders.forEach(album => {
	        album.label = `${album.name} (${album.images_count} images)`;
	        album.value = album.url;
	      })
	      this.setState({availableFolders: result.folders});
	    })
	    .fail((error) => {
	        this.setState({loadingFolders: false, error: "Cannot load folders. Check your internet connection."});
	    })
			.always(() => {
				this.setState({loadingFolders: false});
			});
    }
  }
	
	handleSelectFolder = (e) => this.setState({selectedFolder: e});
	handleSubmit = e => this.props.onSubmit(this.state.selectedFolder);
	
	render() {
		const {
			onHide,
			platform,
		} = this.props;

		const title = "Import from " + (platform !== null ? platform.name : "Platform");
		const isVisible = platform !== null && platform.type === "library";
		return (
			<Modal className={"folder-select"} onHide={onHide} show={isVisible}>
				<Modal.Header closeButton>
					<Modal.Title>
						{title}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body bsClass="my-modal">
					<p>Import the images from your <a target="_blank" href={platform === null ? "" : platform.server_url}>{platform === null ? "" : platform.name} library</a> into a new task.</p>
					<Select
						className="basic-single"
						classNamePrefix="select"
						isLoading={this.state.loadingFolders}
						isClearable={false}
						isSearchable={true}
						onChange={this.handleSelectFolder}
						options={this.state.availableFolders}
						placeholder={this.state.loadingFolders ? "Fetching Piwigo albums..." : "Please select a Piwigo album"}
						name="options"
					/>
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={onHide}>Close</Button>
					<Button
						bsStyle="primary"
						disabled={this.state.selectedFolder === null}
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
