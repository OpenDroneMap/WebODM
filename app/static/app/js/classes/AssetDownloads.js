import { _ } from './gettext';

class AssetDownload{
  constructor(label, asset, icon){
    this.label = label;
    this.asset = asset;
    this.icon = icon;
  }

  downloadUrl(project_id, task_id){
    return `/api/projects/${project_id}/tasks/${task_id}/download/${this.asset}`;
  }

  get separator(){ 
    return false;
  }
}

class AssetDownloadSeparator extends AssetDownload{
  constructor(){
    super("-");
  }

  downloadUrl(){
    return "#";
  }

  get separator(){
    return true;
  }
}

const api = {
  all: function() {
    return [
      new AssetDownload(_("Orthophoto (GeoTIFF)"),"orthophoto.tif","far fa-image"),
      new AssetDownload(_("Orthophoto (PNG)"),"orthophoto.png","far fa-image"),
      new AssetDownload(_("Orthophoto (MBTiles)"),"orthophoto.mbtiles","far fa-image"),
      new AssetDownload(_("Orthophoto (Tiles)"),"orthophoto_tiles.zip","fa fa-table"),
      new AssetDownload(_("Orthophoto (KMZ)"),"orthophoto.kmz","fa fa-globe"),
      new AssetDownload(_("Terrain Model (GeoTIFF)"),"dtm.tif","fa fa-chart-area"),
      new AssetDownload(_("Terrain Model (Tiles)"),"dtm_tiles.zip","fa fa-table"),
      new AssetDownload(_("Surface Model (GeoTIFF)"),"dsm.tif","fa fa-chart-area"),
      new AssetDownload(_("Surface Model (Tiles)"),"dsm_tiles.zip","fa fa-table"),
      new AssetDownload(_("Point Cloud (LAS)"),"georeferenced_model.las","fa fa-cube"),
      new AssetDownload(_("Point Cloud (LAZ)"),"georeferenced_model.laz","fa fa-cube"),
      new AssetDownload(_("Point Cloud (PLY)"),"georeferenced_model.ply","fa fa-cube"),
      new AssetDownload(_("Point Cloud (CSV)"),"georeferenced_model.csv","fa fa-cube"),
      new AssetDownload(_("Textured Model"),"textured_model.zip","fab fa-connectdevelop"),
      new AssetDownload(_("Camera Parameters"),"cameras.json","fa fa-camera"),
      new AssetDownload(_("Camera Shots (GeoJSON)"),"shots.geojson","fa fa-camera"),
      new AssetDownload(_("Ground Control Points (GeoJSON)"),"ground_control_points.geojson","far fa-dot-circle"),
      new AssetDownload(_("Quality Report"),"report.pdf","far fa-file-pdf"),
      
      
      
      new AssetDownloadSeparator(),
      new AssetDownload(_("All Assets"),"all.zip","far fa-file-archive")
    ];
  },

  excludeSeparators: function(){
    return api.all().filter(asset => !asset.separator);
  },

  // @param assets {String[]} list of assets (example: ['geotiff', 'las']))
  only: function(assets){
    return api.all().filter(asset => assets.indexOf(asset.asset) !== -1);
  }
}

export default api;

