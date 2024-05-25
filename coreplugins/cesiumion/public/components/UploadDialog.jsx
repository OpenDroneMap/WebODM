import React, { Component, Fragment } from "react";

import FormDialog from "../../../../app/static/app/js/components/FormDialog";

import BootstrapField from "./BootstrapField";
import FormikErrorFocus from "./FormikErrorFocus";
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

	handleError = msg => error => {
		this.props.onError(msg);
		console.error(error);
	};

	onSubmit = values => {
		const { asset, onSubmit } = this.props;
		values = JSON.parse(JSON.stringify(values));
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
				options.textureFormat = options.textureFormat ? "WEBP" : "AUTO";
				break;
		}

		onSubmit(values);
	};

	getSourceFields() {
		switch (UploadDialog.AssetSourceType[this.props.asset]) {
			case SourceType.RASTER_TERRAIN:
				const loadOptions = ({ isLoading, isError, data }) => {
					if (isLoading || isError)
						return <option disabled>LOADING...</option>;
					const userItems = data.items
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
					<BootstrapField
						name={"options.baseTerrainId"}
						label={"Base Terrain: "}
						type={"select"}
					>
						<IonFetcher
							path="assets"
							onError={this.handleError(
								"Failed to load terrain options. " +
									"Please check your token!"
							)}
						>
							{loadOptions}
						</IonFetcher>
					</BootstrapField>
				);
			case SourceType.CAPTURE:
				return (
					<BootstrapField
						name={"options.textureFormat"}
						type={"checkbox"}
						help={
							"Will produce WebP images, which are typically 25-34% smaller than " +
							"equivalent JPEG images which leads to faster streaming and reduced " +
							"data usage. 3D Tiles produced with this option require a client " +
							"that supports the glTF EXT_texture_webp extension, such as " +
							"CesiumJS 1.54 or newer, and a browser that supports WebP, such as " +
							"Chrome or Firefox 65 and newer."
						}
					>
						Use WebP images
					</BootstrapField>
				);
			default:
				return null;
		}
	}

	getValidation() {
		let errors = {};
        if (!values.name) {
            errors.name = "A name is required!";
        }

        switch (UploadDialog.AssetSourceType[this.props.asset]) {
            case SourceType.RASTER_TERRAIN:
                if (typeof values.options.baseTerrainId !== "string") {
                    errors.baseTerrainId = "Invalid value!";
                }
                break;
            case SourceType.CAPTURE:
                if (typeof values.options.textureFormat !== "boolean") {
                    errors.textureFormat = "Invalid value!";
                }
                break;
        }

        return errors;
	}

	render() {
		const {
			initialValues,
			onHide,
			title,
			loading: isLoading,
			...options
		} = this.props;

		delete options["asset"];
		delete options["onSubmit"];

		const mergedInitialValues = {
			...UploadDialog.defaultProps.initialValues,
			...initialValues
		};

		return (
            <FormDialog
                title={title}
                show={this.props.show}
                onHide={onHide}
                handleSaveFunction={this.onSubmit}
                saveLabel={isLoading ? "Submitting..." : "Submit"}
                savingLabel="Submitting..."
                saveIcon={isLoading ? "fa fa-sync fa-spin" : "fa fa-upload"}
            >
				<form onSubmit={this.onSubmit}>
                    <BootstrapField
                        name={"name"}
                        label={"Name: "}
                        type={"text"}
                        value={mergedInitialValues.name}
                        onChange={this.handleChange}
                    />
                    <BootstrapField
                        name={"description"}
                        label={"Description: "}
                        type={"textarea"}
                        rows={"3"}
                        value={mergedInitialValues.description}
                        onChange={this.handleChange}
                    />
                    <BootstrapField
                        name={"attribution"}
                        label={"Attribution: "}
                        type={"text"}
                        value={mergedInitialValues.attribution}
                        onChange={this.handleChange}
                    />
                    {this.getSourceFields()}
                </form>
            </FormDialog>
        );
	}
}
