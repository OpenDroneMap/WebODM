import React, { Component, Fragment } from "react";

import FormDialog from "../../../../app/static/app/js/components/FormDialog";

import IonField from "./IonField";
import { ImplicitIonFetcher as IonFetcher } from "./Fetcher";
import { AssetType, SourceType } from "../defaults";
import "./UploadDialog.scss";

export default class UploadDialog extends Component {
	static AssetSourceType = {
		[AssetType.ORTHOPHOTO]: SourceType.RASTER_IMAGERY,
		[AssetType.TERRAIN_MODEL]: SourceType.RASTER_TERRAIN,
		[AssetType.SURFACE_MODEL]: SourceType.RASTER_TERRAIN,
		[AssetType.POINTCLOUD]: SourceType.POINTCLOUD,
		[AssetType.TEXTURED_MODEL]: SourceType.CAPTURE
	};

	static defaultProps = {
		show: true,
		asset: null,
		loading: false,
		initialValues: {
			name: "",
			description: "",
			attribution: "",
			options: {
				baseTerrainId: "",
				textureFormat: false
			}
		}
	};

	constructor(props) {
		super(props);

		this.mergedInitialValues = {
			...UploadDialog.defaultProps.initialValues,
			...this.props.initialValues
		};

		this.state = {
			title : props.title,
			...this.mergedInitialValues
		}
	}

    show(){
        this.dialog.show();
    }

    handleChange = (e) => {
        const { value, name } = e.target;
		
		if (name === "options.textureFormat")
		{
			let options = {...this.state.options};
			options["textureFormat"] = value === "Yes";
			this.setState({ options });
		}
		else if (name === "options.baseTerrainId")
		{
			let options = {...this.state.options};
			options["baseTerrainId"] = value;
			this.setState({ options });
		}
		else
		{
			this.setState({ [name]: value });
		}
    }

	handleError = msg => error => {
		this.props.onError(msg);
	};

	onSubmit = values => {
		const { asset, onSubmit } = this.props;
		values = {...this.state};
		const { options = {} } = values;

		switch (UploadDialog.AssetSourceType[asset]) {
			case SourceType.RASTER_TERRAIN:
				if (options.baseTerrainId === "")
					delete options["baseTerrainId"];
				else options.baseTerrainId = parseInt(options.baseTerrainId);
				options.toMeters = 1;
				options.heightReference = "WGS84";
				options.waterMask = false;
				break;
			case SourceType.CAPTURE:
				options.textureFormat = options.textureFormat ? "KTX2" : "AUTO";
				break;
		}

		onSubmit(values);
	};

	getSourceFields() {
		switch (UploadDialog.AssetSourceType[this.props.asset]) {
			case SourceType.RASTER_TERRAIN:
				let loadOptions = ({ isLoading, isError, data }) => {
					if (isLoading || isError){
						return <option disabled>LOADING...</option>;
					}

					let userItems = data.items
						.filter(item => item.type === "TERRAIN")
						.map(item => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						));

					return [
						<option key={"mean-sea-level"} value={""}>
							Mean Sea Level
						</option>,
						...userItems
					];
				};

				return (
					<IonField
						name={"options.baseTerrainId"}
						label={"Base Terrain: "}
						type={"select"}
						value={this.state.options.baseTerrainId}
						onChange={this.handleChange}
					>
						<IonFetcher
							path="assets"
							onError={this.handleError('Failed to load terrain options. Please check your token!')}
						>
							{loadOptions}
						</IonFetcher>
					</IonField>
				);
			case SourceType.CAPTURE:
				return (
					<IonField
						name={"options.textureFormat"}
						label={"Use KTX2 Compression"}
						type={"select"}
						value={this.state.options.textureFormat ? "Yes" : "No"}
						help={'KTX v2.0 is an image container format that supports Basis Universal supercompression. Use KTX2 compression to create a smaller tileset with better streaming performance.'}
						onChange={this.handleChange}
					>
						<option>No</option>
						<option>Yes</option>
					</IonField>
				);
			default:
				return null;
		}
	}

	render() {
		return (
            <FormDialog
                title={this.state.title}
                show={this.props.show}
                onHide={this.props.onHide}
                handleSaveFunction={this.onSubmit}
                saveLabel={this.state.loading ? "Submitting..." : "Submit"}
                savingLabel="Submitting..."
                saveIcon={this.state.loading ? "fa fa-sync fa-spin" : "fa fa-upload"}
                ref={(domNode) => { this.dialog = domNode; }}
            >
                <IonField
                    name={"name"}
                    label={"Name: "}
                    type={"text"}
                    value={this.state.name}
                    onChange={this.handleChange}
                />
                <IonField
                    name={"description"}
                    label={"Description: "}
                    type={"textarea"}
                    rows={"3"}
                    value={this.state.description}
                    onChange={this.handleChange}
                />
                <IonField
                    name={"attribution"}
                    label={"Attribution: "}
                    type={"text"}
                    value={this.state.attribution}
                    onChange={this.handleChange}
                />
                {this.getSourceFields()}
            </FormDialog>
        );
	}
}
