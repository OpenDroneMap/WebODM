class AssetDownload{
  constructor(label, asset, icon){
    this.label = label;
    this.asset = asset;
    this.icon = icon;
  }

  downloadUrl(project_id, task_id){
    return `/api/projects/${project_id}/tasks/${task_id}/download/${this.asset}/`;
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
      new AssetDownload("GeoTIFF","geotiff","fa fa-map-o"),
      new AssetDownload("Textured Model","texturedmodel","fa fa-connectdevelop"),
      new AssetDownload("LAS","las","fa fa-cube"),
      new AssetDownload("PLY","ply","fa fa-cube"),
      new AssetDownload("CSV","csv","fa fa-cube"),
      new AssetDownloadSeparator(),
      new AssetDownload("All Assets","all","fa fa-file-archive-o")
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

