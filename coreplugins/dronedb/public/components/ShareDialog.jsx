import PropTypes from 'prop-types';
import React, { Component } from "react";
import { Modal, Button, FormGroup, FormControl, Radio } from "react-bootstrap";
import Select from 'react-select';
import "./ShareDialog.scss";

const SHARE_MODE_QUICK = 'quick';
const SHARE_MODE_SELECT = 'select';

export default class ShareDialog extends Component {
    static defaultProps = {
        show: false,
        taskName: '',
        filesToShare: []
    };

    static propTypes = {
        onHide: PropTypes.func.isRequired,
        onShare: PropTypes.func.isRequired,
        show: PropTypes.bool.isRequired,
        apiURL: PropTypes.string.isRequired,
        taskName: PropTypes.string,
        filesToShare: PropTypes.array
    };

    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState() {
        return {
            error: "",
            shareMode: SHARE_MODE_QUICK,
            organizations: [],
            datasets: [],
            loadingOrganizations: false,
            loadingDatasets: false,
            selectedOrganization: null,
            selectedDataset: null,
            newDatasetName: '',
            createNewDataset: true,
            info: null
        };
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 bytes';
        const k = 1024;
        const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    componentWillUnmount() {
        // Abort pending AJAX requests to prevent setState on unmounted component
        if (this.infoRequest) this.infoRequest.abort();
        if (this.orgsRequest) this.orgsRequest.abort();
        if (this.datasetsRequest) this.datasetsRequest.abort();
    }

    handleOnShow = () => {
        this.setState(this.getInitialState());
        this.setState({
            loadingOrganizations: true,
            newDatasetName: this.props.taskName || ''
        });

        // Load user info first, then organizations to avoid race condition
        this.infoRequest = $.get(`${this.props.apiURL}/info`)
            .done(infoResult => {
                this.setState({ info: infoResult });

                // Load organizations after info is available
                this.orgsRequest = $.get(`${this.props.apiURL}/organizations`)
                    .done(result => {
                        const orgs = result.map(org => ({
                            label: org.name !== org.slug ? `${org.name} (${org.slug})` : org.slug,
                            value: org.slug
                        }));

                        this.setState({ organizations: orgs, loadingOrganizations: false });

                        if (orgs.length > 0) {
                            // Try to find user's personal organization using infoResult directly
                            const userOrg = infoResult ?
                                orgs.find(org => org.value === infoResult.username) : null;
                            this.handleSelectOrganization(userOrg || orgs[0]);
                        }
                    })
                    .fail((jqXHR) => {
                        if (jqXHR.statusText === 'abort') return;
                        const detail = jqXHR.responseJSON?.detail || jqXHR.statusText || 'Unknown error';
                        this.setState({
                            error: `Cannot load organizations: ${detail}`,
                            loadingOrganizations: false
                        });
                    });
            })
            .fail((jqXHR) => {
                if (jqXHR.statusText === 'abort') return;
                // If info fails, still try to load organizations
                this.setState({ info: null });
                this.orgsRequest = $.get(`${this.props.apiURL}/organizations`)
                    .done(result => {
                        const orgs = result.map(org => ({
                            label: org.name !== org.slug ? `${org.name} (${org.slug})` : org.slug,
                            value: org.slug
                        }));
                        this.setState({ organizations: orgs, loadingOrganizations: false });
                        if (orgs.length > 0) {
                            this.handleSelectOrganization(orgs[0]);
                        }
                    })
                    .fail((jqXHR2) => {
                        if (jqXHR2.statusText === 'abort') return;
                        const detail = jqXHR2.responseJSON?.detail || jqXHR2.statusText || 'Unknown error';
                        this.setState({
                            error: `Cannot load organizations: ${detail}`,
                            loadingOrganizations: false
                        });
                    });
            });
    };

    handleSelectOrganization = (e) => {
        if (!e) return;
        if (this.state.selectedOrganization?.value === e.value) return;

        // Abort previous datasets request if any
        if (this.datasetsRequest) this.datasetsRequest.abort();

        this.setState({
            selectedOrganization: e,
            selectedDataset: null,
            datasets: [],
            loadingDatasets: true
        });

        this.datasetsRequest = $.get(`${this.props.apiURL}/organizations/${e.value}/datasets`)
            .done(result => {
                const datasets = result.map(ds => ({
                    label: ds.name !== ds.slug ?
                        `${ds.name} (${ds.slug})` : ds.slug,
                    value: ds.slug,
                    name: ds.name
                }));

                // Add "Create new" option at the beginning
                datasets.unshift({
                    label: '+ Create new dataset',
                    value: '__new__',
                    isNew: true
                });

                this.setState({
                    datasets,
                    loadingDatasets: false,
                    selectedDataset: datasets[0],
                    createNewDataset: true
                });
            })
            .fail((jqXHR) => {
                if (jqXHR.statusText === 'abort') return;
                const detail = jqXHR.responseJSON?.detail || jqXHR.statusText || 'Unknown error';
                this.setState({
                    error: `Cannot load datasets: ${detail}`,
                    loadingDatasets: false
                });
            });
    };

    handleSelectDataset = (e) => {
        if (!e) return;

        const createNewDataset = e.value === '__new__';
        this.setState({
            selectedDataset: e,
            createNewDataset
        });
    };

    handleModeChange = (mode) => {
        this.setState({ shareMode: mode });
    };

    handleNewDatasetNameChange = (e) => {
        this.setState({ newDatasetName: e.target.value });
    };

    handleSubmit = () => {
        const { shareMode, selectedOrganization, selectedDataset, newDatasetName, createNewDataset } = this.state;

        let tag = null;
        let datasetName = null;

        if (shareMode === SHARE_MODE_SELECT && selectedOrganization) {
            if (createNewDataset) {
                // Will create new dataset in selected org
                // tag format: "org/" means create new dataset in org
                tag = selectedOrganization.value;
                datasetName = newDatasetName || this.props.taskName || null;
            } else if (selectedDataset && selectedDataset.value !== '__new__') {
                // Use existing dataset
                tag = `${selectedOrganization.value}/${selectedDataset.value}`;
            }
        }
        // If SHARE_MODE_QUICK, tag remains null (backend creates personal org + random dataset)

        this.props.onShare({ tag, datasetName });
    };

    getTotalSize() {
        return this.props.filesToShare.reduce((sum, f) => sum + (f.size || 0), 0);
    }

    render() {
        const { onHide, show, filesToShare } = this.props;
        const {
            shareMode,
            organizations,
            datasets,
            loadingOrganizations,
            loadingDatasets,
            selectedOrganization,
            selectedDataset,
            createNewDataset,
            newDatasetName,
            error
        } = this.state;

        const canShare = shareMode === SHARE_MODE_QUICK ||
            (shareMode === SHARE_MODE_SELECT && selectedOrganization &&
                (createNewDataset || (selectedDataset && selectedDataset.value !== '__new__')));

        return (
            <Modal className="share-dialog" onHide={onHide} show={show} onShow={this.handleOnShow}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="ddb-icon fa-fw"></i> Share to DroneDB
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && (
                        <div className="alert alert-warning">
                            {error}
                        </div>
                    )}

                    <FormGroup>
                        <div className="share-mode-option">
                            <Radio
                                name="shareMode"
                                checked={shareMode === SHARE_MODE_QUICK}
                                onChange={() => this.handleModeChange(SHARE_MODE_QUICK)}
                            >
                                <strong>Quick share</strong>
                                <div className="help-text">
                                    Creates a new dataset with auto-generated name in your personal space
                                </div>
                            </Radio>
                        </div>
                        <div className="share-mode-option">
                            <Radio
                                name="shareMode"
                                checked={shareMode === SHARE_MODE_SELECT}
                                onChange={() => this.handleModeChange(SHARE_MODE_SELECT)}
                                disabled={organizations.length === 0 && !loadingOrganizations}
                            >
                                <strong>Choose destination</strong>
                                <div className="help-text">
                                    Select organization and dataset
                                </div>
                            </Radio>
                        </div>
                    </FormGroup>

                    {shareMode === SHARE_MODE_SELECT && (
                        <div className="destination-select">
                            <FormGroup>
                                <label>Organization</label>
                                <Select
                                    className="basic-single"
                                    classNamePrefix="select"
                                    isLoading={loadingOrganizations}
                                    isClearable={false}
                                    isSearchable={true}
                                    value={selectedOrganization}
                                    onChange={this.handleSelectOrganization}
                                    options={organizations}
                                    placeholder={loadingOrganizations ? "Loading..." : "Select organization"}
                                />
                            </FormGroup>

                            <FormGroup>
                                <label>Dataset</label>
                                <Select
                                    className="basic-single"
                                    classNamePrefix="select"
                                    isLoading={loadingDatasets}
                                    isClearable={false}
                                    isSearchable={true}
                                    value={selectedDataset}
                                    onChange={this.handleSelectDataset}
                                    options={datasets}
                                    isDisabled={!selectedOrganization}
                                    placeholder={loadingDatasets ? "Loading..." : "Select dataset"}
                                />
                            </FormGroup>

                            {createNewDataset && (
                                <FormGroup>
                                    <label>New dataset name <small>(optional)</small></label>
                                    <FormControl
                                        type="text"
                                        placeholder="Leave empty for auto-generated name"
                                        value={newDatasetName}
                                        onChange={this.handleNewDatasetNameChange}
                                    />
                                </FormGroup>
                            )}
                        </div>
                    )}

                    <div className="files-summary">
                        <h5>Files to share</h5>
                        <div className="files-info">
                            <span className="badge">{filesToShare.length} files</span>
                            <span className="badge">{this.formatBytes(this.getTotalSize())}</span>
                        </div>
                        <ul className="files-list">
                            {filesToShare.slice(0, 5).map((f, i) => (
                                <li key={i}><i className="fa fa-file"></i> {f.name}</li>
                            ))}
                            {filesToShare.length > 5 && (
                                <li className="more">...and {filesToShare.length - 5} more</li>
                            )}
                        </ul>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={onHide}>Cancel</Button>
                    <Button
                        bsStyle="primary"
                        onClick={this.handleSubmit}
                        disabled={!canShare}
                    >
                        <i className="fa fa-cloud-upload-alt"></i> Share
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
