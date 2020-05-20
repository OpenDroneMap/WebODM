import React from 'react';
import './css/ModelView.scss';
import ErrorMessage from './components/ErrorMessage';
import SwitchModeButton from './components/SwitchModeButton';
import AssetDownloadButtons from './components/AssetDownloadButtons';
import Standby from './components/Standby';
import ShareButton from './components/ShareButton';
import PropTypes from 'prop-types';
import epsg from 'epsg';
import $ from 'jquery';

// Add more proj definitions
const defs = [];
for (let k in epsg){
    if (epsg[k]){
        defs.push([k, epsg[k]]);
    }
}
window.proj4.defs(defs);

require('./vendor/OBJLoader');
require('./vendor/MTLLoader');
require('./vendor/ColladaLoader');

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

    viewer.scene.scene.add( new THREE.AmbientLight( 0x404040, 2.0 ) ); // soft white light );
    viewer.scene.scene.add( new THREE.DirectionalLight( 0xcccccc, 0.5 ) );

    const directional = new THREE.DirectionalLight( 0xcccccc, 0.5 );
    directional.position.z = 99999999999;
    viewer.scene.scene.add( directional );
    

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

          this.loadCameras();

        window.scene = viewer.scene.scene;
         
          viewer.fitToScreen();
        });     
    });
  }

  loadCameras(){
    const { task } = this.props;

    function getMatrix(translation, rotation) {
        var axis = new THREE.Vector3(-rotation[0],
                                    -rotation[1],
                                    -rotation[2]);
        var angle = axis.length();
        axis.normalize();
        var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
        matrix.setPosition(new THREE.Vector3(translation[0], translation[1], translation[2]));
        return matrix.transpose();
    }

    if (task.available_assets.indexOf('shots.geojson') !== -1){
        const colladaLoader = new THREE.ColladaLoader();
        const fileloader = new THREE.FileLoader();
        
        colladaLoader.load('/static/app/models/camera.dae', ( collada ) => {
            const dae = collada.scene;

            fileloader.load(`/api/projects/${task.project}/tasks/${task.id}/download/shots.geojson`,  ( data ) => {
                const geojson = JSON.parse(data);
                const gjproj = proj4.defs("EPSG:4326");

                let pcproj = this.pointCloud.projection;

                if (!pcproj){
                    console.log("NO PROJ!!!");
                    // TODO ?
                }

                const toScene = proj4(gjproj, pcproj);
                const cameraObj = dae.children[0];
                // const cameraObj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial());

                // TODO: instancing doesn't seem to work :/
                // const cameraMeshes = new THREE.InstancedMesh( cameraObj.geometry, cameraObj.material, geojson.features.length );
                // const dummy = new THREE.Object3D();

                window.meshes = [];

                let i = 0;
                geojson.features.forEach(feat => {
                    const coords = feat.geometry.coordinates;

                    const utm = toScene.forward([coords[0], coords[1]]);
                    utm.push(coords[2]); // z in meters doesn't change

                    const cameraMesh = new THREE.Mesh(cameraObj.geometry, cameraObj.material);
                    cameraMesh.matrixAutoUpdate = false;
                    cameraMesh.matrix.set(...getMatrix(utm, feat.properties.rotation).elements);
                    viewer.scene.scene.add(cameraMesh);

                    cameraMesh._feat = feat;
                    window.meshes.push(cameraMesh);

                    i++;
                });

                window.rotate = (arr) => {
                    window.meshes.forEach(m => {
                        const rotation = rotate(arr, m._feat.properties.rotation);
                        m.rotation.x = rotation.x;
                        m.rotation.y = rotation.y;
                        m.rotation.z = rotation.z;
                        
                    })
                }

                // viewer.scene.scene.add(cameraMeshes);
            }, undefined, console.error);
        });
    }
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
                    window.object = object; // TODO REMOVE
    
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
    