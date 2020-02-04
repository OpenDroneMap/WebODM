import React from 'react';
import './css/ModelView.scss';
import ErrorMessage from './components/ErrorMessage';
import SwitchModeButton from './components/SwitchModeButton';
import AssetDownloadButtons from './components/AssetDownloadButtons';
import Standby from './components/Standby';
import ShareButton from './components/ShareButton';
import PropTypes from 'prop-types';
import $ from 'jquery';

window.Potree = require('./vendor/potree');
require('./vendor/OBJLoader');
THREE.MTLLoader = require('./vendor/MTLLoader');

class TexturedModelMenu extends React.Component{
    static propTypes = {
        toggleTexturedModel: PropTypes.func.isRequired
    }

    constructor(props){
        super(props);

        this.state = {
            showTexturedModel: false
        }
    }

    handleClick = (e) => {
        this.setState({showTexturedModel: e.target.checked});
        this.props.toggleTexturedModel(e);
    }

    render(){
        return (<label><input 
                            type="checkbox" 
                            checked={this.state.showTexturedModel}
                            onChange={this.handleClick}
                        /> Show Model</label>);
    }
}

class ModelView extends React.Component {
  static defaultProps = {
    task: null,
    public: false
  };

  static propTypes = {
      task: PropTypes.object.isRequired, // The object should contain two keys: {id: <taskId>, project: <projectId>}
      public: PropTypes.bool // Is the view being displayed via a shared link?
  };

  constructor(props){
    super(props);

    this.state = {
      error: "",
      showTexturedModel: false,
      initializingModel: false
    };

    this.pointCloud = null;
    this.modelReference = null;

    this.toggleTexturedModel = this.toggleTexturedModel.bind(this);
  }

  assetsPath(){
    return `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/assets`
  }

  urlExists = (url, cb) => {
    $.ajax({
        url: url,
        type:'HEAD',
        error: () => {
            cb(false);
        },
        success: () => {
            cb(true);
        }
    });
  }

  pointCloudFilePath = (cb) => {
    // Check if entwine point cloud exists, 
    // otherwise fallback to potree point cloud binary format path
    const entwinePointCloud = this.assetsPath() + '/entwine_pointcloud/ept.json';
    const potreePointCloud = this.assetsPath() + '/potree_pointcloud/cloud.js';

    this.urlExists(entwinePointCloud, (exists) => {
        if (exists) cb(entwinePointCloud);
        else cb(potreePointCloud);
    });
  }

  texturedModelDirectoryPath(){
    return this.assetsPath() + '/odm_texturing/';
  }

  hasGeoreferencedAssets(){
    return this.props.task.available_assets.indexOf('orthophoto.tif') !== -1;
  }

  hasTexturedModel(){
    return this.props.task.available_assets.indexOf('textured_model.zip') !== -1;
  }

  objFilePath(cb){
    const geoUrl = this.texturedModelDirectoryPath() + 'odm_textured_model_geo.obj';
    const nongeoUrl = this.texturedModelDirectoryPath() + 'odm_textured_model.obj';

    $.ajax({
        type: "HEAD",
        url: geoUrl
    }).done(() => {
        cb(geoUrl);
    }).fail(() => {
        cb(nongeoUrl);
    });
  }

  mtlFilename(){
    // For some reason, loading odm_textured_model_geo.mtl does not load textures properly
    return 'odm_textured_model.mtl';
  }

  componentDidMount() {
    let container = this.container;
    if (!container) return; // Enzyme tests don't have support for all WebGL methods so we just skip this

    window.viewer = new Potree.Viewer(container);
    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(1*1000*1000);
    viewer.loadSettingsFromURL();
        
    viewer.loadGUI(() => {
      viewer.setLanguage('en');
      $("#menu_tools").next().show();
      viewer.toggleSidebar();

      if (this.hasTexturedModel()){
          window.ReactDOM.render(<TexturedModelMenu toggleTexturedModel={this.toggleTexturedModel}/>, $("#textured_model_button").get(0));
      }else{
          $("#textured_model").hide();
          $("#textured_model_container").hide();
      }
    });

    this.pointCloudFilePath(pointCloudPath => {
        Potree.loadPointCloud(pointCloudPath, "Point Cloud", e => {
          if (e.type == "loading_failed"){
            this.setState({error: "Could not load point cloud. This task doesn't seem to have one. Try processing the task again."});
            return;
          }
    
          let scene = viewer.scene;
          scene.addPointCloud(e.pointcloud);
          this.pointCloud = e.pointcloud;
    
          let material = e.pointcloud.material;
          material.size = 1;
          material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
          material.pointColorType = Potree.PointColorType.RGB;
         
          viewer.fitToScreen();
        });     
    });
  }

  setPointCloudsVisible = (flag) => {
    for(let pointcloud of viewer.scene.pointclouds){
        pointcloud.visible = flag;
    }
  }

  toggleTexturedModel(e){
    const value = e.target.checked;

    if (value){
      // Need to load model for the first time?
      if (this.modelReference === null && !this.state.initializingModel){

        this.setState({initializingModel: true});

        const mtlLoader = new THREE.MTLLoader();
        mtlLoader.setTexturePath(this.texturedModelDirectoryPath());
        mtlLoader.setPath(this.texturedModelDirectoryPath());

        mtlLoader.load(this.mtlFilename(), (materials) => {
            materials.preload();

            const objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);
            this.objFilePath(filePath => {
                objLoader.load(filePath, (object) => {
                    const bboxWorld = this.pointCloud.getBoundingBoxWorld();
                    const pcCenter = new THREE.Vector3();
                    bboxWorld.getCenter(pcCenter);
    
                    object.position.set(pcCenter.x, pcCenter.y, pcCenter.z);
    
                    // Bring the model close to center
                    if (object.children.length > 0){
                      const geom = object.children[0].geometry;
    
                      // Compute center
                      geom.computeBoundingBox();
    
                      let center = new THREE.Vector3();
                      geom.boundingBox.getCenter(center);
    
                      object.translateX(-center.x);
                      object.translateY(-center.y);
                      object.translateZ(-center.z);
                    } 
    
                    viewer.scene.scene.add(object);
    
                    this.modelReference = object;
                    this.setPointCloudsVisible(false);
    
                    this.setState({
                      initializingModel: false,
                    });
                });
            });
        });
      }else{
        // Already initialized
        this.modelReference.visible = true;
        this.setPointCloudsVisible(false);
      }
    }else{
      this.modelReference.visible = false;
      this.setPointCloudsVisible(true);
    }
  }

  // React render
  render(){
    return (<div className="model-view">
          <ErrorMessage bind={[this, "error"]} />
          <div className="container potree_container" 
             style={{height: "100%", width: "100%", position: "relative"}} 
             onContextMenu={(e) => {e.preventDefault();}}>
                <div id="potree_render_area" ref={(domNode) => { this.container = domNode; }}></div>
                <div id="potree_sidebar_container"> </div>
          </div>

          <div className="model-action-buttons">
            <AssetDownloadButtons 
                            task={this.props.task} 
                            direction="up" 
                            showLabel={false}
                            buttonClass="btn-secondary" />
            {(!this.props.public) ? 
            <ShareButton 
                ref={(ref) => { this.shareButton = ref; }}
                task={this.props.task} 
                popupPlacement="top"
                linksTarget="3d"
            />
            : ""}
            <SwitchModeButton 
                public={this.props.public}
                task={this.props.task}
                type="modelToMap" />
        </div>

          <Standby 
            message="Loading textured model..."
            show={this.state.initializingModel}
            />
      </div>);
  }
}

$(function(){
    $("[data-modelview]").each(function(){
        let props = $(this).data();
        delete(props.modelview);
        window.ReactDOM.render(<ModelView {...props}/>, $(this).get(0));
    });
});

export default ModelView;
    