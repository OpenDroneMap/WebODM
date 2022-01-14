import PropTypes from 'prop-types';
import { Component } from "react";
import { Modal, Button, FormGroup, ControlLabel, FormControl, HelpBlock } from "react-bootstrap";
import Select from 'react-select';
import "./SelectUrlDialog.scss";

export default class SelectUrlDialog extends Component {
	static defaultProps = {
		platform: null,
		show: false,
		ddbUrl: null
	};
	static propTypes = {
		onHide: PropTypes.func.isRequired,
		onSubmit: PropTypes.func.isRequired,
		ddbUrl: PropTypes.string,
		show: PropTypes.bool.isRequired,
		apiURL: PropTypes.string.isRequired,
  	}

	constructor(props){
		super(props);

		this.state = {
			error: "",
			organizations: [],
			datasets: [],
			folders: [],
			loadingOrganizations: true,
			loadingDatasets: false,
			loadingFolders: false,
			hasLogin: false,
			selectedOrganization: null,
			selectedDataset: null,
			selectedFolder: null,
		};
	}

	// Format bytes to readable string
	formatBytes(bytes, decimals=2) {
		if(bytes == 0) return '0 bytes';
		var k = 1024,
			dm = decimals || 2,
			sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
			i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}
	

	componentDidMount() {

		$.get(`${this.props.apiURL}/organizations/`)
			.done(result => {
				
				var orgs = result.map(org => {
					return { label: org.name !== org.slug ? `${org.name} (${org.slug})` : org.slug, value: org.slug };
				});

				if (orgs.length > 0) {
					this.setState({organizations: orgs, selectedOrganization: orgs[0], loadingOrganizations: false});
					this.handleSelectOrganization(orgs[0]);
				} else 
					this.setState({organizations: orgs, loadingOrganizations: false});
			})
			.fail((error) => {
				this.setState({error: "Cannot load organizations. Check your internet connection."});
			})
			.always(() => {
				this.setState({loadingOrganizations: false});
			});

	}
	
	handleSelectOrganization = (e) => {

		this.setState({loadingDatasets: true, selectedOrganization: e, selectedDataset: null, selectedFolder: null});
		console.log("Load datasets of", e);

		$.get(`${this.props.apiURL}/organizations/${e.value}/datasets/`)
			.done(result => {				
				
				var dss = result.map(ds => {
					return { label: ds.name !== ds.slug ? 
						`${ds.name} (${ds.slug}) - ${ds.entries} files (${this.formatBytes(ds.size)})`: 
						`${ds.name} - ${ds.entries} files (${this.formatBytes(ds.size)})`, value: ds.slug };
				});

				if (dss.length > 0) {
					this.setState({datasets: dss, selectedDataset: dss[0], loadingDatasets: false});
					this.handleSelectDataset(dss[0]);
				} else 
					this.setState({datasets: dss, loadingDatasets: false});

			})
			.fail((error) => {
				this.setState({error: "Cannot load datasets. Check your internet connection."});
			})
			.always(() => {
				this.setState({loadingDatasets: false});
			});
	};

	handleSelectDataset = (e) => {

		this.setState({selectedDataset: e, selectedFolder: null, loadingFolders: true});
		console.log("Load folders of", e);

		$.get(`${this.props.apiURL}/organizations/${this.state.selectedOrganization.value}/datasets/${e.value}/folders/`)
			.done(result => {
				
				var folders = result.map(folder => {
					return { label: folder, value: folder };
				});

				folders.unshift({label: '/', value: '/'});
				folders.sort();

				if (folders.length > 0) {
					this.setState({folders: folders, selectedFolder: folders[0], loadingFolders: false});
					this.handleSelectFolder(folders[0]);
				} else 
					this.setState({folders: folders, loadingFolders: false});

			})
			.fail((error) => {
				this.setState({error: "Cannot load folders. Check your internet connection."});
			})
			.always(() => {
				this.setState({loadingFolders: false});
			});
	};

	handleSelectFolder = e => {
		console.log(e);
		this.setState({selectedFolder: e});
	}

	handleChange = (e) => {
		console.log("Change", e);
	};

	handleSubmit = e => {
		console.log("Submit");
		//this.props.onSubmit(this.state.selectedFolder);
	};

	render() {
		const {
			onHide,
			ddbUrl,
			show
		} = this.props;

		//const isVisible = true;
		return (
			<Modal className={"folder-select"} onHide={onHide} show={show}>
				<Modal.Header closeButton>
					<Modal.Title>
						Import from DroneDB
					</Modal.Title>
				</Modal.Header>
				<Modal.Body bsClass="my-modal">					
					<p>Import the images from your DroneDB account</p>
					<Select
						className="basic-single"
						classNamePrefix="select"
						isLoading={this.state.loadingOrganizations}
						isClearable={false}
						isSearchable={true}
						value={this.state.selectedOrganization}
						onChange={this.handleSelectOrganization}
						options={this.state.organizations}
						placeholder={this.state.loadingOrganizations ? "Fetching organizations..." : "Please select an organization"}
						name="organizations"
					/>		
					<Select
						className="basic-single"
						classNamePrefix="select"
						isLoading={this.state.loadingDatasets}
						isClearable={false}
						isSearchable={true}
						value={this.state.selectedDataset}
						isDisabled={this.state.selectedOrganization === null}
						onChange={this.handleSelectDataset}
						options={this.state.datasets}
						placeholder={this.state.loadingDatasets ? "Fetching datasets..." : (this.state.datasets.length > 0 ? "Please select a dataset" : "No datasets found")}
						name="datasets"
					/>
					<Select
						className="basic-single"
						classNamePrefix="select"
						isLoading={this.state.loadingFolders}
						isClearable={false}
						isSearchable={true}
						value={this.state.selectedFolder}
						isDisabled={this.state.selectedDataset === null || this.state.selectedOrganization === null}
						onChange={this.handleSelectFolder}
						options={this.state.folders}
						placeholder={this.state.loadingFolders ? "Fetching folders..." : "Please select a folder"}
						name="folders"
					/>	
					<p>DroneDB url</p>
					<FormControl
						type="url"
						placeholder={"Enter DroneDB url"}
						onChange={this.handleChange}
					/>
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={onHide}>Close</Button>
					<Button
						bsStyle="primary"
						
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
