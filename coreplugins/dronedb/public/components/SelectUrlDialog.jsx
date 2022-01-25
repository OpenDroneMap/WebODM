import PropTypes from 'prop-types';
import React, { Component, Fragment } from "react";
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

		this.resetState();
	}

	resetState() {
		
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
			info: null,
		
			verDs: null,
			verCount: 0,
			verSize: 0,
			verFolder: null,

			// verifyStatus: null (not started), 'loading', 'success', 'error'
			verifyStatus: null
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
	
	handleOnShow = () => {

		this.resetState();
		
		$.get(`${this.props.apiURL}/organizations`)
			.done(result => {
				
				var orgs = result.map(org => {
					return { label: org.name !== org.slug ? `${org.name} (${org.slug})` : org.slug, value: org.slug };
				});

				if (orgs.length > 0) {
					this.setState({organizations: orgs, loadingOrganizations: false});

					// Search for user organization
					var userOrg = orgs.find(org => org.value === this.state.info.username);

					this.handleSelectOrganization(userOrg != null ? userOrg : orgs[0]);
				} else 
					this.setState({organizations: orgs, loadingOrganizations: false});
			})
			.fail((error) => {
				this.setState({error: "Cannot load organizations. Check your internet connection.", organizations: []});
			})
			.always(() => {
				this.setState({loadingOrganizations: false});
			});

		$.get(`${this.props.apiURL}/info`)
			.done(result => {				
				this.setState({info: result});
			})
			.fail((error) => {
				this.setState({info: null});
			});
	}

	handleVerify = () => {

		this.setState({verifyStatus: 'loading'});

		$.post(`${this.props.apiURL}/verifyurl`, { url: this.state.ddbUrl }).done(result => {
			
			if (result != null) {
				this.setState({
					verifyStatus: result.count > 0 ? 'success' : 'error',
					verCount: result.count,
					verDs: result.ds,
					verSize: result.size,
					verFolder: result.folder
				});
			} else {
				this.setState({verifyStatus: 'error'});
			}

			
		})
		.fail((error) => {
			this.setState({verifyStatus: 'error'});
		});

	}

	
	handleSelectOrganization = (e) => {

		if (this.state.selectedOrganization !== null && e.value === this.state.selectedOrganization.value) return;

		this.setState({
			loadingDatasets: true, 
			selectedOrganization: e, 
			selectedDataset: null, 
			selectedFolder: null,
			verifyStatus: null,
			datasets: [],
			folders: []
		});

		$.get(`${this.props.apiURL}/organizations/${e.value}/datasets`)
			.done(result => {				
				
				var dss = result.map(ds => {
					return { label: ds.name !== ds.slug ? 
						`${ds.name} (${ds.slug}) - ${ds.entries} entries (${this.formatBytes(ds.size)})`: 
						`${ds.name} - ${ds.entries} entries (${this.formatBytes(ds.size)})`, name: ds.name, value: ds.slug };
				});

				if (dss.length > 0) {
					this.setState({datasets: dss, loadingDatasets: false});
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

		if (this.state.selectedDataset !== null && e.value === this.state.selectedDataset.value) return;

		this.setState({
			selectedDataset: e, 
			selectedFolder: null, 
			loadingFolders: true,
			verifyStatus: null,
			folders: []
		});

		$.get(`${this.props.apiURL}/organizations/${this.state.selectedOrganization.value}/datasets/${e.value}/folders`)
			.done(result => {
				
				var folders = result.map(folder => {
					return { label: folder, value: '/' + folder };
				});

				folders.unshift({label: '/', value: '/'});
				folders.sort();

				if (folders.length > 0) {
					this.setState({folders: folders, loadingFolders: false});
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
		
		if (this.state.selectedFolder !== null && e.value === this.state.selectedFolder.value) return;

		this.setState({selectedFolder: e, verifyStatus: null});
		
		if (this.state.info == null || this.state.info.hubUrl == null) {
			console.warn("Cannot generate ddb url, no hub url");
			return;
		}

		var url = `${this.state.info.hubUrl}/${this.state.selectedOrganization.value}/${this.state.selectedDataset.value}${e.value}`
			.replace('http://', 'ddb+unsafe://')
			.replace('https://', 'ddb://');

		this.setState({ddbUrl: url});

	}

	handleChange = (e) => {
		this.setState({ddbUrl: e.target.value, verifyStatus: null});
	};

	handleSubmit = e => {
	
		this.props.onSubmit(
			{
				name: this.state.verDs != null ? this.state.verDs : "DroneDB",
				url: this.state.ddbUrl,
				images_count: this.state.verCount
			});
	};

	render() {
		const {
			onHide,
			ddbUrl,
			show
		} = this.props;

		return (
			<Modal className={"folder-select"} onHide={onHide} show={show} onShow={this.handleOnShow}>
				<Modal.Header closeButton>
					<Modal.Title>
						Import from DroneDB
					</Modal.Title>
				</Modal.Header>
				<Modal.Body bsClass="my-modal">		
					{this.state.organizations!= null && this.state.organizations.length > 0 ? 		
					<div style={{'marginBottom': '20px'}}>
						<p>Import images from your DroneDB account</p>
						<div className={"select-row"}>
							<div className={"icon-cell"}>
								<i className={"fas fa-sitemap"}></i>
							</div>
							<div className={"select-cell"}>
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
							</div>
						</div>
						<div className={"select-row"}>
							<div className={"icon-cell"}>
								<i className={"fas fa-database"}></i>
							</div>
							<div className={"select-cell"}>				
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
							</div>
						</div>
						<div className={"select-row"}>
							<div className={"icon-cell"}>
								<i className={"fas fa-folder"}></i>
							</div>
							<div className={"select-cell"}>
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
							</div>
						</div>
					</div> : <div className="text-center">
						{this.state.loadingOrganizations ? <i className="fa fa-circle-notch fa-spin fa-fw"></i> : 
							<div className={"alert alert-info"}>									
								<span><a href="/plugins/dronedb"><strong>Setup your DroneDB credentials</strong></a> to browse your organizations, datasets and folders!</span>
							</div>}
						</div>
					}

					<p>DroneDB URL</p>
					<div className={"select-row"}>
						<div className={"icon-cell"}>
							<i className={"fas fa-globe"}></i>
						</div>
						<div className={"select-cell"}>
							<FormControl
								type="url"
								placeholder={"https://hub.dronedb.app/r/username/dataset"}
								value={this.state.ddbUrl || ''}
								onChange={this.handleChange} />
						</div>
						<div className={"icon-cell"}>
							{ this.state.verifyStatus==='loading' && <i className={"fas fa-spinner fa-spin"}></i> }
							{ this.state.verifyStatus==='success' && <i className={"fas fa-check"}></i> }
							{ this.state.verifyStatus==='error' && <i className={"fas fa-times"}></i> }
						</div>
					</div>
					
					{this.state.verifyStatus != null && this.state.verifyStatus == "success" ?
								<div className={"alert alert-success"}>									
									<span>Found <strong>{this.state.verCount}</strong> files ({this.formatBytes(this.state.verSize)})</span>
								</div>									
						: ""}	
						
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={onHide}>Close</Button>
					<Button bsStyle="success" disabled={this.state.ddbUrl == null || this.state.ddbUrl.length == 0} onClick={this.handleVerify}>
						<i className={"fas fa-check"} />Verify</Button>
					<Button bsStyle="primary" disabled={this.state.verifyStatus !== 'success'} onClick={this.handleSubmit}>
						<i className={"fa fa-upload"} />Import</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}
