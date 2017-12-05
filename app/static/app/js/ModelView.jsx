import React from 'react';
import './css/ModelView.scss';
import ErrorMessage from './components/ErrorMessage';
import SwitchModeButton from './components/SwitchModeButton';
import AssetDownloadButtons from './components/AssetDownloadButtons';
import Standby from './components/Standby';
import ShareButton from './components/ShareButton';
import PropTypes from 'prop-types';
import $ from 'jquery';

const THREE = require('./vendor/potree/js/three'); // import does not work :/
require('./vendor/OBJLoader');
THREE.MTLLoader = require('./vendor/MTLLoader');

import Potree from './vendor/potree';

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
    this.handleMouseClick = this.handleMouseClick.bind(this);
  }

  assetsPath(){
    return `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/assets`
  }

  potreeFilePath(){
    return this.assetsPath() + '/potree_pointcloud/cloud.js';
  }

  texturedModelDirectoryPath(){
    return this.assetsPath() + '/odm_texturing/';
  }

  hasGeoreferencedAssets(){
    return this.props.task.available_assets.indexOf('orthophoto.tif') !== -1;
  }

  objFilePath(){
    let file =  this.hasGeoreferencedAssets() ?
                'odm_textured_model_geo.obj' : 
                'odm_textured_model.obj';

    return this.texturedModelDirectoryPath() + file; 
  }

  mtlFilename(){
    // For some reason, loading odm_textured_model_geo.mtl does not load textures properly
    return 'odm_textured_model.mtl';
  }

  handleMouseClick(e){
    // Make sure the share popup closes
    if (this.shareButton) this.shareButton.hidePopup();
  }

  componentDidMount() {
    let container = this.container;

    window.viewer = new Potree.Viewer(container);
    viewer.setEDLEnabled(true);
    viewer.setPointSize(1);
    viewer.setMaterial("RGB"); // ["RGB", "Elevation", "Classification", "Intensity"]
    viewer.setFOV(60);
    viewer.setPointSizing("Adaptive"); // ["Fixed", "Attenuated", "Adaptive"]
    viewer.setQuality("Squares"); // ["Squares", "Circles", "Interpolation"]
    viewer.setPointBudget(1*1000*1000);
    viewer.setIntensityRange(0, 300);
    viewer.setWeightClassification(1);
    viewer.setBackground("gradient"); // ["skybox", "gradient", "black", "white"];
    viewer.loadSettingsFromURL();
    
    viewer.loadGUI(() => {
      viewer.setLanguage('en');
      $("#menu_tools").next().show();
      viewer.toggleSidebar();
    });

    // Sigeom
    Potree.loadPointCloud(this.potreeFilePath(), "", e => {
      if (e.type == "loading_failed"){
        this.setState({error: "Could not load point cloud. This task doesn't seem to have one. Try processing the task again."});
        return;
      }

      let scene = viewer.scene;
      scene.addPointCloud(e.pointcloud);
      this.pointCloud = e.pointcloud;
      
      viewer.fitToScreen();
    });     
  }

  toggleTexturedModel(e){
    const value = e.target.checked;
    this.setState({showTexturedModel: value});

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
            objLoader.load(this.objFilePath(), (object) => {
                
                object.position.set(this.pointCloud.position.x, 
                                    this.pointCloud.position.y, 
                                    this.pointCloud.position.z);
                
                // Bring the model close to center
                if (object.children.length > 0){
                  const geom = object.children[0].geometry;

                  // Compute center
                  geom.computeBoundingBox();

                  const center = geom.boundingBox.getCenter();

                  object.translateX(-center.x + this.pointCloud.boundingBox.max.x / 2);
                  object.translateY(-center.y + this.pointCloud.boundingBox.max.y / 2);
                  object.translateZ(-center.z);
                } 

                viewer.scene.scene.add(object);

                this.modelReference = object;

                this.viewerOpacity = viewer.getOpacity();
                viewer.setOpacity(0);

                this.setState({
                  initializingModel: false,
                });
            });
        });
      }else{
        // Already initialized
        this.modelReference.visible = true;

        this.viewerOpacity = viewer.getOpacity();
        viewer.setOpacity(0);
      }
    }else{
      this.modelReference.visible = false;

      viewer.setOpacity(this.viewerOpacity);
    }
  }

  // React render
  render(){
    const showSwitchModeButton = this.hasGeoreferencedAssets();
    const hideWithTexturedModel = {display: this.state.showTexturedModel ? "none" : "block"};

    return (<div className="model-view">
          <ErrorMessage bind={[this, "error"]} />
          <div 
            className="container"
            style={{height: "100%", width: "100%", position: "relative"}} 
            onContextMenu={(e) => {e.preventDefault();}}>
              <div 
                id="potree_render_area" 
                ref={(domNode) => { this.container = domNode; }}>
                  <div id="potree_map" className="mapBox">
                    <div id="potree_map_header">
                    </div>
                    <div id="potree_map_content" className="map"></div>
                  </div>
              </div>

              <div id="potree_sidebar_container" onClick={this.handleMouseClick}>

                <div id="sidebar_root" 
                  className="navmenu navmenu-default navmenu-fixed-left unselectable">
                  <span className="potree_sidebar_brand">
                    <span id="potree_version_number"></span>
                  </span>

                  <div className="action-buttons">
                    <div className="textured-model-chkbox-container">
                      <label><input 
                                type="checkbox" 
                                onChange={this.toggleTexturedModel}
                                checked={this.state.showTexturedModel}
                              /> Textured Model</label>
                    </div>
                    <AssetDownloadButtons 
                      task={this.props.task} 
                      direction="down" 
                      buttonClass="btn-secondary" />
                    
                    <div className="action-buttons-row">
                      {(!this.props.public) ? 
                        <ShareButton 
                          ref={(ref) => { this.shareButton = ref; }}
                          task={this.props.task} 
                          popupPlacement="bottom"
                          linksTarget="3d"
                        />
                      : ""}
                      {showSwitchModeButton ? 
                        <SwitchModeButton 
                          public={this.props.public}
                          style={{marginLeft: this.props.public ? '0' : '76px'}}
                          task={this.props.task}
                          type="modelToMap" /> : ""}
                    </div>
                  </div>

                  <div className="accordion">
                  
                    <h3 id="menu_appearance" style={hideWithTexturedModel}><span data-i18n="tb.rendering_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul className="pv-menu-list">
                      <li><span data-i18n="appearance.nb_max_pts"></span>:<span id="lblPointBudget"></span> <div id="sldPointBudget"></div> </li>
                      <li><span data-i18n="appearance.point_size"></span>:<span id="lblPointSize"></span> <div id="sldPointSize"></div>   </li>
                      <li><span data-i18n="appearance.field_view"></span>:<span id="lblFOV"></span><div id="sldFOV"></div>          </li>
                      <li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity"></span><div id="sldOpacity"></div>       </li>
                       
                       <li>
                         <label htmlFor="optPointSizing" className="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
                         <select id="optPointSizing" name="optPointSizing">
                          <option>Fixed</option>
                          <option>Attenuated</option>
                          <option>Adaptive</option>
                        </select>
                      </li>
                      
                      <li>
                         <label htmlFor="optQuality" className="pv-select-label" data-i18n="appearance.point_quality"></label>
                         <select id="optQuality" name="optQuality">
                          <option>Squares</option>
                          <option>Circles</option>
                          <option>Interpolation</option>
                        </select>
                      </li>   
                       
                      <div>
                        <div className="divider">
                          <span>Eye-Dome-Lighting</span>
                        </div>
                        
                        <li><label><input type="checkbox" id="chkEDLEnabled" onClick={() => { viewer.setEDLEnabled(this.checked) }}/><span data-i18n="appearance.edl_enable"></span></label></li>
                        <li><span data-i18n="appearance.edl_radius"></span>:<span id="lblEDLRadius"></span><div id="sldEDLRadius"></div></li>
                        <li><span data-i18n="appearance.edl_strength"></span>:<span id="lblEDLStrength"></span><div id="sldEDLStrength"></div></li>
                      </div>
                      
                      <div>
                        <div className="divider">
                          <span>Background</span>
                        </div>
                        
                        <li><label><input type="radio" name="background" value="skybox" onClick={() => { viewer.setBackground("skybox") }}/><span>Skybox</span></label></li>
                        <li><label><input type="radio" name="background" value="gradient" onClick={() => { viewer.setBackground("gradient") }}/><span>Gradient</span></label></li>
                        <li><label><input type="radio" name="background" value="black" onClick={() => { viewer.setBackground("black") }}/><span>Black</span></label></li>
                        <li><label><input type="radio" name="background" value="white" onClick={() => { viewer.setBackground("white") }}/><span>White</span></label></li>
                      </div>
                        
                      </ul>
                      
                    </div>
                    
                    <h3 id="menu_tools"><span data-i18n="tb.tools_opt"></span></h3>
                    <div>
                      <ul className="pv-menu-list">
                        <div>
                        
                          <li id="tools" style={hideWithTexturedModel}></li>
                          
                          <div className="divider" style={hideWithTexturedModel}>
                            <span>Navigation</span>
                          </div>
                          <li id="navigation"></li>
                          <li><span data-i18n="appearance.move_speed"></span>: <span id="lblMoveSpeed"></span><div id="sldMoveSpeed"></div></li>
                          
                        </div>
                      </ul>
                    </div>

                    <h3 id="menu_measurements" style={hideWithTexturedModel}><span data-i18n="tb.measurments_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul className="pv-menu-list selectable" id="measurement_details"></ul>
                    </div>
                    
                    <h3 id="menu_annotations" style={hideWithTexturedModel}><span data-i18n="tb.annotations_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul className="pv-menu-list selectable" id="annotation_details"></ul>
                    </div>
                    
                    <h3 id="menu_materials" style={hideWithTexturedModel}><span data-i18n="tb.materials_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul className="pv-menu-list">
                      <li>
                         <label htmlFor="optMaterial" className="pv-select-label">Attributes:</label><br/>
                         <select id="optMaterial" name="optMaterial">
                         </select>
                      </li>
                      
                      <div id="materials.composite_weight_container">
                        <div className="divider">
                          <span>Attribute Weights</span>
                        </div>
                      
                        <li>RGB: <span id="lblWeightRGB"></span> <div id="sldWeightRGB"></div>  </li>
                        <li>Intensity: <span id="lblWeightIntensity"></span> <div id="sldWeightIntensity"></div>  </li>
                        <li>Elevation: <span id="lblWeightElevation"></span> <div id="sldWeightElevation"></div>  </li>
                        <li>Classification: <span id="lblWeightClassification"></span> <div id="sldWeightClassification"></div> </li>
                        <li>Return Number: <span id="lblWeightReturnNumber"></span> <div id="sldWeightReturnNumber"></div>  </li>
                        <li>Source ID: <span id="lblWeightSourceID"></span> <div id="sldWeightSourceID"></div>  </li>
                      </div>
                      
                      <div id="materials.rgb_container">
                        <div className="divider">
                          <span>RGB</span>
                        </div>
                      
                        <li>Gamma: <span id="lblRGBGamma"></span> <div id="sldRGBGamma"></div>  </li>
                        <li>Brightness: <span id="lblRGBBrightness"></span> <div id="sldRGBBrightness"></div> </li>
                        <li>Contrast: <span id="lblRGBContrast"></span> <div id="sldRGBContrast"></div> </li>
                      </div>
                      
                      
                      <div id="materials.elevation_container">
                        <div className="divider">
                          <span>Elevation</span>
                        </div>
                      
                        <li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange"></span> <div id="sldHeightRange"></div> </li>
                      </div>
                      
                      <div id="materials.transition_container">
                        <div className="divider">
                          <span>Transition</span>
                        </div>
                      
                        <li>transition: <span id="lblTransition"></span> <div id="sldTransition"></div> </li>
                      </div>
                      
                      <div id="materials.intensity_container">
                        <div className="divider">
                          <span>Intensity</span>
                        </div>
                      
                        <li>Range: <span id="lblIntensityRange"></span> <div id="sldIntensityRange"></div>  </li>
                        <li>Gamma: <span id="lblIntensityGamma"></span> <div id="sldIntensityGamma"></div>  </li>
                        <li>Brightness: <span id="lblIntensityBrightness"></span> <div id="sldIntensityBrightness"></div> </li>
                        <li>Contrast: <span id="lblIntensityContrast"></span> <div id="sldIntensityContrast"></div> </li>
                      </div>
                        
                      
                      </ul>
                    </div>
                    <h3 id="menu_scene" style={hideWithTexturedModel}><span data-i18n="tb.scene_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul className="pv-menu-list selectable">
                        <div>
                          <li><span data-i18n="scene.camera_position"></span>:<span id="lblCameraPosition"></span></li>
                          <li><span data-i18n="scene.camera_target"></span>:<span id="lblCameraTarget"></span></li>
                        </div>
                        <li id="sceneList"></li>
                      </ul>
                    </div>
                  
                    <h3 id="menu_classification" style={hideWithTexturedModel}><span data-i18n="tb.classification_filter_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul id="classificationList" className="pv-menu-list"></ul>
                    </div>
                  
                    <h3 id="menu_other_settings" style={hideWithTexturedModel}><span data-i18n="tb.parameters_opt"></span></h3>
                    <div style={hideWithTexturedModel}>
                      <ul className="pv-menu-list">
                        <li><span data-i18n="appearance.min_node_size"></span><span id="lblMinNodeSize"></span><div id="sldMinNodeSize"></div>  </li>
                        <li>
                           <label htmlFor="optClipMode" className="pv-select-label"><span data-i18n="appearance.clip_mode"></span></label>
                           <select id="optClipMode" name="optClipMode">
                            <option>No Clipping</option>
                            <option>Highlight Inside</option>
                            <option>Clip Outside</option>
                          </select>
                        </li>
                        <li><label><input type="checkbox" onClick={() => { viewer.setShowBoundingBox(this.checked) }}/><span data-i18n="appearance.box"></span></label></li>
                        <li><label><input type="checkbox" onClick={() => { viewer.setFreeze(this.checked) }}/><span data-i18n="appearance.freeze"></span></label></li>
                      </ul>
                      </div>
                      
                    <h3 id="menu_about"><span data-i18n="tb.about_opt"></span></h3>
                    <div>
                    <ul className="pv-menu-list">
                      <li><a href="http://potree.org" target="_blank">Potree</a> is a viewer for large point cloud / LIDAR data sets, developed at the Vienna University of Technology. 
                      <a href="https://github.com/potree/potree" target="_blank">(github)</a>
                      </li>
                      <li>Author: <a href="mailto:mschuetz@potree.org">Markus Sch&uuml;tz</a></li>
                      <li>License: <a target="_blank" href="http://potree.org/wp/potree_license/">FreeBSD (2-clause BSD)</a></li>
                      <li>Libraries:
                        <ul>
                          <li><a target="_blank" href="http://threejs.org/">three.js</a></li>
                          <li><a target="_blank" href="https://jquery.com/">Jquery</a></li>
                          <li><a target="_blank" href="http://www.laszip.org/">laszip</a></li>
                          <li><a target="_blank" href="https://github.com/verma/plasio">Plas.io (laslaz) </a></li>
                          <li><a target="_blank" href="http://openlayers.org/">OpenLayers3</a></li>
                          <li><a target="_blank" href="http://proj4js.org/">proj4js</a></li>
                          <li><a target="_blank" href="https://github.com/tweenjs/tween.js/">tween</a></li>
                          <li><a target="_blank" href="https://github.com/i18next/i18next/">i18next</a></li>
                        </ul>
                      </li>
                      <li>Donators:
                        <ul>
                          <li><a target="_blank" href="http://rapidlasso.com/">rapidlasso</a></li>
                          <li><a target="_blank" href="https://georepublic.info/en/">georepublic</a></li>
                          <li><a target="_blank" href="http://sitn.ne.ch/">sitn</a></li>
                          <li><a target="_blank" href="http://www.veesus.com/veesus/index.php">Veesus</a></li>
                          <li><a target="_blank" href="http://sigeom.ch/">sigeom sa</a></li>
                          <li><a target="_blank" href="http://archpro.lbg.ac.at/">LBI ArchPro</a></li>
                        </ul>
                      </li>
                      <li>Credits:
                        <ul>
                          <li><a target="_blank" href="https://www.cg.tuwien.ac.at/staff/MichaelWimmer.html">Michael Wimmer</a> &amp; 
                            <a target="_blank" href="https://www.cg.tuwien.ac.at/staff/ClausScheiblauer.html">Claus Scheiblauer</a></li>
                          <li><a target="_blank" href="https://www.cg.tuwien.ac.at/">TU Wien, Insitute of Computer Graphics and Algorithms</a></li>
                          <li><a target="_blank" href="https://harvest4d.org/">Harvest4D</a></li>
                          <li><a target="_blank" href="http://rapidlasso.com/">rapidlasso</a></li>
                          <li><a target="_blank" href="https://georepublic.info/en/">georepublic</a></li>
                          <li><a target="_blank" href="http://hobu.co/">Howard Butler, Uday Verma, Connor Manning</a></li>
                          <li><a target="_blank" href="http://www.danielgm.net/cc/">Cloud Compare</a></li>
                          <li><a target="_blank" href="http://sitn.ne.ch/">sitn</a></li>
                        </ul>
                      </li>
                    </ul>
                    </div>
                  </div>
                </div>
              </div>

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
    