import AssetType from "./AssetType";

const AssetStyles = {
	[AssetType.ORTHOPHOTO]: {
		name: "Orthophoto",
		icon: "fa-map-o"
	},
	[AssetType.TERRAIN_MODEL]: {
		name: "Terrain Model",
		icon: "fa-area-chart"
	},
	[AssetType.SURFACE_MODEL]: {
		name: "Surface Model",
		icon: "fa-area-chart"
	},
	[AssetType.POINTCLOUD]: {
		name: "Pointcloud",
		icon: "fa-cube"
	},
	[AssetType.TEXTURED_MODEL]: {
		name: "Texture Model",
		icon: "fa-connectdevelop"
	}
};

export default AssetStyles;
