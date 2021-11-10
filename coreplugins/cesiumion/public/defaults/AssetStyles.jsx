import AssetType from "./AssetType";

const AssetStyles = {
	[AssetType.ORTHOPHOTO]: {
		name: "Orthophoto",
		icon: "far fa-image"
	},
	[AssetType.TERRAIN_MODEL]: {
		name: "Terrain Model",
		icon: "fa fa-chart-area"
	},
	[AssetType.SURFACE_MODEL]: {
		name: "Surface Model",
		icon: "fa fa-chart-area"
	},
	[AssetType.POINTCLOUD]: {
		name: "Pointcloud",
		icon: "fa fa-cube"
	},
	[AssetType.TEXTURED_MODEL]: {
		name: "Texture Model",
		icon: "fab fa-connectdevelop"
	}
};

export default AssetStyles;
