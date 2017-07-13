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
      new AssetDownload("Orthophoto (GeoTIFF)","orthophoto.tif","fa fa-map-o"),
      new AssetDownload("Orthophoto (PNG)","orthophoto.png","fa fa-picture-o"),
      new AssetDownload("Terrain Model (GeoTIFF)","dtm.tif","fa fa-area-chart"),
      new AssetDownload("Surface Model (GeoTIFF)","dsm.tif","fa fa-area-chart"),
      new AssetDownload("Point Cloud (LAS)","georeferenced_model.las","fa fa-cube"),
      new AssetDownload("Point Cloud (PLY)","georeferenced_model.ply","fa fa-cube"),
      new AssetDownload("Point Cloud (CSV)","georeferenced_model.csv","fa fa-cube"),
      new AssetDownload("Textured Model","textured_model.zip","fa fa-connectdevelop"),
      new AssetDownloadSeparator(),
      new AssetDownload("All Assets","all.zip","fa fa-file-archive-o")
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

