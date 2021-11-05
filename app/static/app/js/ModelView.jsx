import React from 'react';
import './css/ModelView.scss';
import ErrorMessage from './components/ErrorMessage';
import SwitchModeButton from './components/SwitchModeButton';
import AssetDownloadButtons from './components/AssetDownloadButtons';
import Standby from './components/Standby';
import ShareButton from './components/ShareButton';
import ImagePopup from './components/ImagePopup';
import PropTypes from 'prop-types';
import * as THREE from 'THREE';
import $ from 'jquery';
import { _, interpolate } from './classes/gettext';

require('./vendor/OBJLoader');
require('./vendor/MTLLoader');
require('./vendor/ColladaLoader');

class SetCameraView extends React.Component{
    static propTypes = {
        viewer: PropTypes.object.isRequired,
        task: PropTypes.object.isRequired
    }

    constructor(props){
        super(props);
        
        this.state = {
            error: "",
            showOk: false
        }
    }

    handleClick = () => {
        const { view } = Potree.saveProject(this.props.viewer);
        const showError = () => {
            this.setState({error: _("Cannot set initial camera view")});
            setTimeout(() => this.setState({error: ""}), 3000);
        };
        const showOk = () => {
            this.setState({showOk: true});
            setTimeout(() => this.setState({showOk: false}), 2000);
        }

        $.ajax({
            url: `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/3d/cameraview`,
            contentType: 'application/json',
            data: JSON.stringify(view),
            dataType: 'json',
            type: 'POST'
          }).done(result => {
            if (result.success) showOk();
            else showError();
          }).fail(() => {
            showError();
          });
    }

    render(){
        return ([<input key="btn" type="button" onClick={this.handleClick} 
                    style={{marginBottom: 12, display: 'inline-block'}} name="set_camera_view" 
                    value={_("set initial camera view")} />,
                this.state.showOk ? (<div key="ok" style={{color: 'lightgreen', display: 'inline-block', marginLeft: 12}}>✓</div>) : "",
                this.state.error ? (<div key="error" style={{color: 'red'}}>{this.state.error}</div>) : ""
                ]
        );
    }
}

class TexturedModelMenu extends React.Component{
    static propTypes = {
        toggleTexturedModel: PropTypes.func.isRequired
    }

    constructor(props){
        super(props);

        this.state = {
            showTexturedModel: false
        }
        
        // Translation for sidebar.html
        _("Cameras");
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
                        /> {_("Show Model")}</label>);
    }
}

class CamerasMenu extends React.Component{
    static propTypes = {
        toggleCameras: PropTypes.func.isRequired
    }

    constructor(props){
        super(props);

        this.state = {
            showCameras: false
        }
    }

    handleClick = (e) => {
        this.setState({showCameras: e.target.checked});
        this.props.toggleCameras(e);
    }

    render(){
        return (<label><input 
                            type="checkbox" 
                            checked={this.state.showCameras}
                            onChange={this.handleClick}
                        /> {_("Show Cameras")}</label>);
    }
}

class ModelView extends React.Component {
  static defaultProps = {
    task: null,
    public: false,
    shareButtons: true
  };

  static propTypes = {
      task: PropTypes.object.isRequired, // The object should contain two keys: {id: <taskId>, project: <projectId>}
      public: PropTypes.bool, // Is the view being displayed via a shared link?
      shareButtons: PropTypes.bool
  };

  constructor(props){
    super(props);

    this.state = {
      error: "",
      showTexturedModel: false,
      initializingModel: false,
      selectedCamera: null,
      modalOpen: false
    };

    this.pointCloud = null;
    this.modelReference = null;

    this.toggleTexturedModel = this.toggleTexturedModel.bind(this);
    this.toggleCameras = this.toggleCameras.bind(this);
    

    this.cameraMeshes = [];
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

  loadGeoreferencingOffset = (cb) => {
    const geoFile = `${this.assetsPath()}/odm_georeferencing/coords.txt`;
    const legacyGeoFile = `${this.assetsPath()}/odm_georeferencing/odm_georeferencing_model_geo.txt`;
    const getGeoOffsetFromUrl = (url) => {
        $.ajax({
            url: url,
            type: 'GET',
            error: () => {
                console.warn(`Cannot find ${url} (not georeferenced?)`);
                cb({x: 0, y: 0});
            },
            success: (data) => {
                const lines = data.split("\n");
                if (lines.length >= 2){
                    const [ x, y ] = lines[1].split(" ").map(parseFloat);
                    cb({x, y});
                }else{
                    console.warn(`Malformed georeferencing file: ${data}`);
                    cb({x: 0, y: 0});
                }
            }
        });
    };

    $.ajax({
        type: "HEAD",
        url: legacyGeoFile
    }).done(() => {
        // If a legacy georeferencing file is present
        // we'll use that
        getGeoOffsetFromUrl(legacyGeoFile);
    }).fail(() => {
        getGeoOffsetFromUrl(geoFile);
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

  hasCameras(){
    return this.props.task.available_assets.indexOf('shots.geojson') !== -1;
  }

  objFilePath(cb){
    // Mostly for backward compatibility
    // as newer versions of ODM do not have 
    // a odm_textured_model.obj
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

  mtlFilename(cb){
    // Mostly for backward compatibility
    // as newer versions of ODM do not have 
    // a odm_textured_model.mtl
    const geoUrl = this.texturedModelDirectoryPath() + 'odm_textured_model_geo.mtl';

    $.ajax({
        type: "HEAD",
        url: geoUrl
    }).done(() => {
        cb("odm_textured_model_geo.mtl");
    }).fail(() => {
        cb("odm_textured_model.mtl");
    });
  }

  getSceneData(){
      let json = Potree.saveProject(window.viewer);

      // Remove view, settings since we don't want to trigger
      // scene updates when these change.
      delete json.view;
      delete json.settings;
      delete json.cameraAnimations;

      return json;
  }

  componentDidMount() {
    let container = this.container;
    if (!container) return; // Enzyme tests don't have support for all WebGL methods so we just skip this

    window.viewer = new Potree.Viewer(container);
    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(1*1000*1000);
    viewer.setEDLEnabled(true);
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

      if (this.hasCameras()){
          window.ReactDOM.render(<CamerasMenu toggleCameras={this.toggleCameras}/>, $("#cameras_button").get(0));
      }else{
          $("#cameras").hide();
          $("#cameras_container").hide();
      }

      if (!this.props.public){
          const $scv = $("<div id='set-camera-view'></div>");
          $scv.prependTo($("#scene_export").parent());
          window.ReactDOM.render(<SetCameraView viewer={viewer} task={this.props.task} />, $scv.get(0));
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

          viewer.fitToScreen();

          // Load saved scene (if any)
          $.ajax({
              type: "GET",
              url: `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/3d/scene`
          }).done(sceneData => {
            let localSceneData = Potree.saveProject(viewer);

            // Check if we do not have a view set
            // if so, just keep the current view information
            if (!sceneData.view || !sceneData.view.position){
                sceneData.view = localSceneData.view;
            }

            const keepKeys = ['pointclouds', 'settings', 'cameraAnimations'];
            for (let k of keepKeys){
                sceneData[k] = localSceneData[k];
            }
            
            for (let k in localSceneData){
                if (keepKeys.indexOf(k) === -1){
                    sceneData[k] = sceneData[k] || localSceneData[k];
                }
            }

            // Load
            const potreeLoadProject = () => {
                Potree.loadProject(viewer, sceneData);
                viewer.removeEventListener("update", potreeLoadProject);
            };
            viewer.addEventListener("update", potreeLoadProject);

            // Every 3 seconds, check if the scene has changed
            // if it has, save the changes server-side
            // Unfortunately Potree does not have reliable events
            // for trivially detecting changes in measurements
            let saveSceneReq = null;
            let saveSceneInterval = null;
            let saveSceneErrors = 0;
            let prevSceneData = JSON.stringify(this.getSceneData());
            
            const postSceneData = (sceneData) => {
                if (saveSceneReq){
                    saveSceneReq.abort();
                    saveSceneReq = null;
                }
    
                saveSceneReq = $.ajax({
                    url: `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/3d/scene`,
                    contentType: 'application/json',
                    data: sceneData,
                    dataType: 'json',
                    type: 'POST'
                    }).done(result => {
                        if (result.success){
                            saveSceneErrors = 0;
                            prevSceneData = sceneData;
                        }else{
                            console.warn("Cannot save Potree scene");
                        }
                    }).fail(() => {
                        console.error("Cannot save Potree scene");
                        if (++saveSceneErrors === 5) clearInterval(saveSceneInterval);
                    });
            };

            const checkScene = () => {
                const sceneData = JSON.stringify(this.getSceneData());
                if (sceneData !== prevSceneData) postSceneData(sceneData);
            };

            saveSceneInterval = setInterval(checkScene, 3000);
          }).fail(e => {
            console.error("Cannot load 3D scene information", e);
          });
        });
    });

    viewer.renderer.domElement.addEventListener( 'mousedown', this.handleRenderMouseClick );
    viewer.renderer.domElement.addEventListener( 'mousemove', this.handleRenderMouseMove );
    
  }

  componentWillUnmount(){
    viewer.renderer.domElement.removeEventListener( 'mousedown', this.handleRenderMouseClick );
    viewer.renderer.domElement.removeEventListener( 'mousemove', this.handleRenderMouseMove );
    
  }

  getCameraUnderCursor = (evt) => {
    const raycaster = new THREE.Raycaster();
    const rect = viewer.renderer.domElement.getBoundingClientRect();
    const [x, y] = [evt.clientX, evt.clientY];
    const array = [ 
        ( x - rect.left ) / rect.width, 
        ( y - rect.top ) / rect.height 
    ];
    const onClickPosition = new THREE.Vector2(...array);
    const camera = viewer.scene.getActiveCamera();
    const mouse = new THREE.Vector3(
        + ( onClickPosition.x * 2 ) - 1, 
        - ( onClickPosition.y * 2 ) + 1 );
    raycaster.setFromCamera( mouse, camera );
    const intersects = raycaster.intersectObjects( this.cameraMeshes );

    if ( intersects.length > 0){
        const intersection = intersects[0];
        return intersection.object;
    }
  }

  setCameraOpacity(camera, opacity){
    camera.material.forEach(m => {
        m.opacity = opacity;
    });
  }

  handleRenderMouseMove = (evt) => {
    if (this._prevCamera && this._prevCamera !== this.state.selectedCamera) {
        this.setCameraOpacity(this._prevCamera, 0.7);
    }

    const camera = this.getCameraUnderCursor(evt);
    if (camera){
        viewer.renderer.domElement.classList.add("pointer-cursor");
        this.setCameraOpacity(camera, 1);
    }else{
        viewer.renderer.domElement.classList.remove("pointer-cursor");
    }
    this._prevCamera = camera;
  }

  handleRenderMouseClick = (evt) => {
    let camera = this.getCameraUnderCursor(evt);
    // Deselect
    if (camera === this.state.selectedCamera){
        this.setState({selectedCamera: null});
    }else if (camera){
        if (this.state.selectedCamera){
            this.setCameraOpacity(this.state.selectedCamera, 0.7);
        }
        this.setState({selectedCamera: camera});
    }
  }

  closeThumb = (e) => {
    e.stopPropagation();
    this.setState({selectedCamera: null});
  }

  loadCameras(){
    const { task } = this.props;

    function getMatrix(translation, rotation, scale) {
        var axis = new THREE.Vector3(-rotation[0],
                                    -rotation[1],
                                    -rotation[2]);
        var angle = axis.length();
        axis.normalize();
        var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
        matrix.setPosition(new THREE.Vector3(translation[0], translation[1], translation[2]));
        
        if (scale != 1.0){
            matrix.scale(new THREE.Vector3(scale, scale, scale));
        }

        return matrix.transpose();
    }

    if (this.hasCameras()){
        const colladaLoader = new THREE.ColladaLoader();
        const fileloader = new THREE.FileLoader();
        
        colladaLoader.load('/static/app/models/camera.dae', ( collada ) => {
            const dae = collada.scene;

            fileloader.load(`/api/projects/${task.project}/tasks/${task.id}/download/shots.geojson`,  ( data ) => {
                const geojson = JSON.parse(data);
                const cameraObj = dae.children[0];
                cameraObj.material.forEach(m => {
                    m.transparent = true; 
                    m.opacity = 0.7;
                });
                
                // const cameraObj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial());

                // TODO: instancing doesn't seem to work :/
                // const cameraMeshes = new THREE.InstancedMesh( cameraObj.geometry, cameraObj.material, geojson.features.length );
                // const dummy = new THREE.Object3D();

                let i = 0;
                geojson.features.forEach(feat => {
                    const material = cameraObj.material.map(m => m.clone());
                    const cameraMesh = new THREE.Mesh(cameraObj.geometry, material);
                    cameraMesh.matrixAutoUpdate = false;
                    let scale = 1.0;
                    // if (!this.pointCloud.projection) scale = 0.1;

                    cameraMesh.matrix.set(...getMatrix(feat.properties.translation, feat.properties.rotation, scale).elements);
                    
                    viewer.scene.scene.add(cameraMesh);

                    cameraMesh._feat = feat;
                    this.cameraMeshes.push(cameraMesh);

                    i++;
                });
            }, undefined, console.error);
        });
    }
  }

  setPointCloudsVisible = (flag) => {
    viewer.setEDLEnabled(true);
    
    // Using opacity we can still perform measurements
    viewer.setEDLOpacity(flag ? 1 : 0);

    // for(let pointcloud of viewer.scene.pointclouds){
    //     pointcloud.visible = flag;
    // }
  }

  toggleCameras(e){
    if (this.cameraMeshes.length === 0){
        this.loadCameras();
        if (this.cameraMeshes.length === 0) return;
    }

    const isVisible = this.cameraMeshes[0].visible;
    this.cameraMeshes.forEach(cam => cam.visible = !isVisible);
  }

  toggleTexturedModel(e){
    const value = e.target.checked;

    if (value){
      // Need to load model for the first time?
      if (this.modelReference === null && !this.state.initializingModel){

        this.setState({initializingModel: true});

        const mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath(this.texturedModelDirectoryPath());

        this.mtlFilename(mtlPath => {
            mtlLoader.load(mtlPath, (materials) => {
                materials.preload();
    
                const objLoader = new THREE.OBJLoader();
                objLoader.setMaterials(materials);
                this.objFilePath(filePath => {
                    objLoader.load(filePath, (object) => {
                        this.loadGeoreferencingOffset((offset) => {
                            object.translateX(offset.x);
                            object.translateY(offset.y);
            
                            viewer.scene.scene.add(object);
            
                            this.modelReference = object;
                            this.setPointCloudsVisible(false);
            
                            this.setState({
                                initializingModel: false,
                            });
                        });
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
    const { selectedCamera } = this.state;
    const { task } = this.props;

    return (<div className="model-view">
          <ErrorMessage bind={[this, "error"]} />
          <div className="container potree_container" 
             style={{height: "100%", width: "100%", position: "relative"}}
             onContextMenu={(e) => {e.preventDefault();}}>
                <div id="potree_render_area" 
                    ref={(domNode) => { this.container = domNode; }}></div>
                <div id="potree_sidebar_container"> </div>
          </div>

          <div className={"model-action-buttons " + (this.state.modalOpen ? "modal-open" : "")}>
            <AssetDownloadButtons 
                            task={this.props.task} 
                            direction="up" 
                            showLabel={false}
                            buttonClass="btn-secondary"
                            onModalOpen={() => this.setState({modalOpen: true})}
                            onModalClose={() => this.setState({modalOpen: false})} />
            {(this.props.shareButtons && !this.props.public) ? 
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

        {selectedCamera ? <div className="thumbnail">
            <a className="close-thumb" href="javascript:void(0)" onClick={this.closeThumb}><i className="fa fa-window-close"></i></a>
            <ImagePopup feature={selectedCamera._feat} task={task} />
        </div> : ""}

          <Standby 
            message={_("Loading textured model...")}
            show={this.state.initializingModel}
            />
      </div>);
  }
}

$(function(){
    // Use gettext for translations
    const oldInit = i18n.init;
    i18n.addPostProcessor("gettext", function(v, k, opts){
        if (v){
            return _(v);
        }else return v;
    });
    i18n.init = function(opts, cb){
        opts.preload = ['en'];
        opts.postProcess = "gettext";
        oldInit(opts, cb);
    };

    $("[data-modelview]").each(function(){
        let props = $(this).data();
        delete(props.modelview);
        window.ReactDOM.render(<ModelView {...props}/>, $(this).get(0));
    });
});

export default ModelView;
    