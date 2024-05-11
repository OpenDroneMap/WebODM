import React, { Component, Fragment } from "react";

import FormDialog from "webodm/components/FormDialog";
import { Formik } from "formik";
import * as Yup from "yup";
import { Row, Col, Modal, Button } from "react-bootstrap";

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
		const schema = {};

		switch (UploadDialog.AssetSourceType[this.props.asset]) {
			case SourceType.RASTER_TERRAIN:
				schema.baseTerrainId = Yup.string();
				break;
			case SourceType.CAPTURE:
				schema.textureFormat = Yup.boolean();
				break;
		}

		return Yup.object().shape({
			name: Yup.string().required("A name is required!"),
			options: Yup.object()
				.shape(schema)
				.default({})
		});
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
			<Modal className={"ion-upload"} onHide={onHide} {...options}>
				<Modal.Header closeButton>
					<Modal.Title>
						<i className={"fa fa-cesium"} /> {title}
					</Modal.Title>
				</Modal.Header>
				<Formik
					initialValues={mergedInitialValues}
					onSubmit={this.onSubmit}
					enableReinitialize
					validationSchema={this.getValidation()}
				>
					{({ handleSubmit = () => {} }) => (
						<form>
							<Modal.Body>
								<BootstrapField
									name={"name"}
									label={"Name: "}
									type={"text"}
								/>
								<BootstrapField
									name={"description"}
									label={"Description: "}
									type={"textarea"}
									rows={"3"}
								/>
								<BootstrapField
									name={"attribution"}
									label={"Attribution: "}
									type={"text"}
								/>
								{this.getSourceFields()}

								<FormikErrorFocus />
							</Modal.Body>

							<Modal.Footer>
								<Button onClick={onHide}>Close</Button>
								{isLoading && (
									<Button bsStyle="primary" disabled>
										<i
											className={"fa fa-sync fa-spin"}
										/>
										Submitting...
									</Button>
								)}
								{!isLoading && (
									<Button
										bsStyle="primary"
										onClick={handleSubmit}
									>
										<i className={"fa fa-upload"} />
										Submit
									</Button>
								)}
							</Modal.Footer>
						</form>
					)}
				</Formik>
			</Modal>
		);
	}
}
