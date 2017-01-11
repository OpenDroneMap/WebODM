import React from 'react';
import './css/ModelView.scss';
import $ from 'jquery';

const THREE = require('three'); // import does not work :/
require('./vendor/OBJLoader');
THREE.MTLLoader = require('./vendor/MTLLoader');
THREE.OrbitControls = require('three-orbit-controls')(THREE);

import Stats from './vendor/Stats';
import dat from './vendor/dat.gui';
import Potree from './vendor/potree';
import ProgressBar from './vendor/potree/ProgressBar';

class ModelView extends React.Component {
  static defaultProps = {
    test: 1
  };

  static propTypes = {
      test: React.PropTypes.number
  };

  constructor(props){
    super(props);

    this.state = {
    };
  }

  componentDidMount() {
    var container = this.container;

    var sceneProperties = {
      // path:     "/static/app/test/lion_takanawa/cloud.js",
      // path:     "/static/app/test/conv/cloud.js",
      path:     "/static/app/test/brighton/cloud.js",
      cameraPosition: null,
      cameraTarget: null,
      sizeType:     "Adaptive",     // options: "Fixed", "Attenuated", "Adaptive"
      quality:    "Interpolation",  // options: "Squares", "Circles", "Interpolation", "Splats"
      fov:      75,         // field of view in degree
      material:     "RGB",        // options: "RGB", "Height", "Intensity", "Classification"
      pointLimit:   1,          // max number of points in millions
      navigation:   "Orbit",      // options: "Earth", "Orbit", "Flight"
      pointSize:    1.2
    };

    if(sceneProperties.quality === null){
      sceneProperties.quality = "Squares";
    }

    var fov = sceneProperties.fov;
    var pointSize = sceneProperties.pointSize;
    var pointCountTarget = sceneProperties.pointLimit;
    var opacity = 1;
    var pointSizeType = null;
    var pointColorType = null;
    var pointShape = Potree.PointShape.SQUARE;
    var clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
    var quality = null;
    var isFlipYZ = false;
    var useDEMCollisions = false;
    var minNodeSize = 100;
    var directionalLight;

    var showStats = false;
    var showBoundingBox = false;
    var freeze = false;

    var fpControls;
    var orbitControls;
    var earthControls;
    var controls;

    var progressBar = new ProgressBar(container);

    var pointcloudPath = sceneProperties.path;

    var gui;
    var renderer;
    var camera;
    var scene;
    var scenePointCloud;
    var sceneBG, cameraBG;
    var pointcloud;
    var skybox;
    var stats;
    var clock = new THREE.Clock();
    var showSkybox = false;
    var measuringTool;
    var profileTool;
    var volumeTool;
    var transformationTool;
    var referenceFrame;

    function setPointSizeType(value){
      if(value === "Fixed"){
        pointSizeType = Potree.PointSizeType.FIXED;
      }else if(value === "Attenuated"){
        pointSizeType = Potree.PointSizeType.ATTENUATED;
      }else if(value === "Adaptive"){
        pointSizeType = Potree.PointSizeType.ADAPTIVE;
      }
    };

    function setQuality(value){
      if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
        quality = "Squares";
      }else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
        quality = "Squares";
      }else{
        quality = value;
      }
    };

    function setMaterial(value){
      if(value === "RGB"){
        pointColorType = Potree.PointColorType.RGB;
      }else if(value === "Color"){
        pointColorType = Potree.PointColorType.COLOR;
      }else if(value === "Elevation"){
        pointColorType = Potree.PointColorType.HEIGHT;
      }else if(value === "Intensity"){
        pointColorType = Potree.PointColorType.INTENSITY;
      }else if(value === "Intensity Gradient"){
        pointColorType = Potree.PointColorType.INTENSITY_GRADIENT;
      }else if(value === "Classification"){
        pointColorType = Potree.PointColorType.CLASSIFICATION;
      }else if(value === "Return Number"){
        pointColorType = Potree.PointColorType.RETURN_NUMBER;
      }else if(value === "Source"){
        pointColorType = Potree.PointColorType.SOURCE;
      }else if(value === "Tree Depth"){
        pointColorType = Potree.PointColorType.TREE_DEPTH;
      }else if(value === "Point Index"){
        pointColorType = Potree.PointColorType.POINT_INDEX;
      }else if(value === "Normal"){
        pointColorType = Potree.PointColorType.NORMAL;
      }else if(value === "Phong"){
        pointColorType = Potree.PointColorType.PHONG;
      }
    };

    function initGUI(){

      setPointSizeType(sceneProperties.sizeType);
      setQuality(sceneProperties.quality);
      setMaterial(sceneProperties.material);

      // dat.gui
      gui = new dat.GUI({autoPlace:false});
      $(gui.domElement).prependTo(container);
      
      var params = {
        "Textured Model": false,
        "Points": pointCountTarget,
        "Point Size": pointSize,
        "FOV": sceneProperties.fov,
        "Opacity": opacity,
        "Size Type" : sceneProperties.sizeType,
        "Show Octree" : false,
        "Materials" : sceneProperties.material,
        "Clip Mode": "Highlight Inside",
        "Quality": sceneProperties.quality,
        "Skybox": false,
        "WebGL Stats": showStats,
        "Show Origin": false,
        "Bounding Box": showBoundingBox,
        "DEM Collisions": useDEMCollisions,
        "Minimum Node Size": minNodeSize,
        "Freeze": freeze
      };

      var pToggleTexturedModel = gui.add(params, 'Textured Model');
      pToggleTexturedModel.onChange(toggleTexturedModel);
      
      var pPoints = gui.add(params, 'Points', 0, 4);
      pPoints.onChange(function(value){
        pointCountTarget = value ;
      });
      
      var fAppearance = gui.addFolder('Appearance');
      
      var pPointSize = fAppearance.add(params, 'Point Size', 0, 3);
      pPointSize.onChange(function(value){
        pointSize = value;
      });
      
      var fFOV = fAppearance.add(params, 'FOV', 20, 100);
      fFOV.onChange(function(value){
        fov = value;
      });
      
      var pOpacity = fAppearance.add(params, 'Opacity', 0, 1);
      pOpacity.onChange(function(value){
        opacity = value;
      });
      
      var pSizeType = fAppearance.add(params, 'Size Type', [ "Fixed", "Attenuated", "Adaptive"]);
      pSizeType.onChange(function(value){
        setPointSizeType(value);
      });
      
      var options = [];
      var attributes = pointcloud.pcoGeometry.pointAttributes
      if(attributes === "LAS" || attributes === "LAZ"){
        options = [ 
        "RGB", "Color", "Elevation", "Intensity", "Intensity Gradient", 
        "Classification", "Return Number", "Source",
        "Tree Depth"];
      }else{
        for(var i = 0; i < attributes.attributes.length; i++){
          var attribute = attributes.attributes[i];
          
          if(attribute === Potree.PointAttribute.COLOR_PACKED){
            options.push("RGB");
          }else if(attribute === Potree.PointAttribute.INTENSITY){
            options.push("Intensity");
            options.push("Intensity Gradient");
          }else if(attribute === Potree.PointAttribute.CLASSIFICATION){
            options.push("Classification");
          }
        }
        if(attributes.hasNormals()){
          options.push("Phong");
          options.push("Normal");
        }
        
        options.push("Elevation");
        options.push("Color");
        options.push("Tree Depth");
      }
      
      // default material is not available. set material to Elevation
      if(options.indexOf(params.Materials) < 0){
        console.error("Default Material '" + params.Material + "' is not available. Using Elevation instead");
        setMaterial("Elevation");
        params.Materials = "Elevation";
      }
      
      
      var pMaterial = fAppearance.add(params, 'Materials',options);
      pMaterial.onChange(function(value){
        setMaterial(value);
      });
      
      var qualityOptions = ["Squares", "Circles"];
      if(Potree.Features.SHADER_INTERPOLATION.isSupported()){
        qualityOptions.push("Interpolation");
      }
      if(Potree.Features.SHADER_SPLATS.isSupported()){
        qualityOptions.push("Splats");
      }
      var pQuality = fAppearance.add(params, 'Quality', qualityOptions);
      pQuality.onChange(function(value){
        quality = value;
      });
      
      var pSykbox = fAppearance.add(params, 'Skybox');
      pSykbox.onChange(function(value){
        showSkybox = value;
      });
      
      var fSettings = gui.addFolder('Settings');
      
      var pClipMode = fSettings.add(params, 'Clip Mode', [ "No Clipping", "Clip Outside", "Highlight Inside"]);
      pClipMode.onChange(function(value){
        if(value === "No Clipping"){
          clipMode = Potree.ClipMode.DISABLED;
        }else if(value === "Clip Outside"){
          clipMode = Potree.ClipMode.CLIP_OUTSIDE;
        }else if(value === "Highlight Inside"){
          clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
        }
      });
      
      var pDEMCollisions = fSettings.add(params, 'DEM Collisions');
      pDEMCollisions.onChange(function(value){
        useDEMCollisions = value;
      });
      
      var pMinNodeSize = fSettings.add(params, 'Minimum Node Size', 0, 1500);
      pMinNodeSize.onChange(function(value){
        minNodeSize = value;
      });
      
      var fDebug = gui.addFolder('Debug');

      
      var pStats = fDebug.add(params, 'WebGL Stats');
      pStats.onChange(function(value){
        showStats = value;
      });
      
      var pShowOrigin = fDebug.add(params, 'Show Origin');
      pShowOrigin.onChange(toggleOrigin);

      var pBoundingBox = fDebug.add(params, 'Bounding Box');
      pBoundingBox.onChange(function(value){
        showBoundingBox = value;
      });
      
      var pFreeze = fDebug.add(params, 'Freeze');
      pFreeze.onChange(function(value){
        freeze = value;
      });

      // stats
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      stats.domElement.style.margin = '5px';
      container.appendChild( stats.domElement );
    }

    var width = container.clientWidth;
    var height = container.clientHeight;

    const initThree = () => {
      var aspect = width / height;
      var near = 0.1;
      var far = 1000*1000;

      scene = new THREE.Scene();
      scenePointCloud = new THREE.Scene();
      sceneBG = new THREE.Scene();
      
      camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      cameraBG = new THREE.Camera();
      camera.rotation.order = 'ZYX';
      
      referenceFrame = new THREE.Object3D();
      scenePointCloud.add(referenceFrame);

      renderer = new THREE.WebGLRenderer();
      renderer.setSize(width, height);
      renderer.autoClear = false;
      container.appendChild(renderer.domElement);
      
      skybox = Potree.utils.loadSkybox("/static/app/test/resources/textures/skybox/");

      // camera and controls
      camera.position.set(-304, 372, 318);
      camera.rotation.y = -Math.PI / 4;
      camera.rotation.x = -Math.PI / 6;
      
      //useOrbitControls();
      earthControls = new THREE.EarthControls(camera, renderer, scenePointCloud);
      earthControls.addEventListener("proposeTransform", function(event){
        if(!pointcloud || !useDEMCollisions){
          return;
        }
        
        var demHeight = pointcloud.getDEMHeight(event.newPosition);
        if(event.newPosition.y < demHeight){
          event.objections++;
        }
      });
      useEarthControls();
      
      // enable frag_depth extension for the interpolation shader, if available
      renderer.context.getExtension("EXT_frag_depth");

      // load pointcloud
      if(pointcloudPath.indexOf("cloud.js") > 0){
        Potree.POCLoader.load(pointcloudPath, function(geometry){
          pointcloud = new Potree.PointCloudOctree(geometry);
          
          pointcloud.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
          pointcloud.material.size = pointSize;
          pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
          
          referenceFrame.add(pointcloud);
          
          referenceFrame.updateMatrixWorld(true);
          var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
          
          referenceFrame.position.copy(sg.center).multiplyScalar(-1);
          referenceFrame.updateMatrixWorld(true);

          if(sg.radius > 50*1000){
            camera.near = 10;
          }else if(sg.radius > 10*1000){
            camera.near = 2;
          }else if(sg.radius > 1000){
            camera.near = 1;
          }else if(sg.radius > 100){
            camera.near = 0.5;
          }else{
            camera.near = 0.1;
          }
          
          
          flipYZ();
          camera.zoomTo(pointcloud, 1);
          initGUI();  
        
          earthControls.pointclouds.push(pointcloud); 
          
          if(sceneProperties.navigation === "Earth"){
            useEarthControls();
          }else if(sceneProperties.navigation === "Orbit"){
            useOrbitControls();
          }else if(sceneProperties.navigation === "Flight"){
            useFPSControls();
          }else{
            console.warning("No navigation mode specified. Using OrbitControls");
            useOrbitControls();
          }
          
          if(sceneProperties.cameraPosition != null){
            var cp = new THREE.Vector3(sceneProperties.cameraPosition[0], sceneProperties.cameraPosition[1], sceneProperties.cameraPosition[2]);
            camera.position.copy(cp);
          }
          
          if(sceneProperties.cameraTarget != null){
            var ct = new THREE.Vector3(sceneProperties.cameraTarget[0], sceneProperties.cameraTarget[1], sceneProperties.cameraTarget[2]);
            camera.lookAt(ct);
            
            if(sceneProperties.navigation === "Orbit"){
              controls.target.copy(ct);
            }
          }         
        });
      }else{
        throw new Error("pointcloudPath does not contain a reference to cloud.js");
      }
      
      measuringTool = new Potree.MeasuringTool(scenePointCloud, camera, renderer);
      profileTool = new Potree.ProfileTool(scenePointCloud, camera, renderer);
      volumeTool = new Potree.VolumeTool(scenePointCloud, camera, renderer);
      transformationTool = new Potree.TransformationTool(scenePointCloud, camera, renderer);
      
      // background
      var texture = Potree.utils.createBackgroundTexture(512, 512);
      
      texture.minFilter = texture.magFilter = THREE.NearestFilter;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      
      var bg = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(2, 2, 0),
        new THREE.MeshBasicMaterial({
          map: texture
        })
      );
      bg.material.depthTest = false;
      bg.material.depthWrite = false;
      sceneBG.add(bg);      
      
      window.addEventListener( 'keydown', onKeyDown, false );
      
      directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
      directionalLight.position.set( 10, 10, 10 );
      directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
      scenePointCloud.add( directionalLight );
      
      var light = new THREE.AmbientLight( 0x555555 ); // soft white light
      scenePointCloud.add( light );
    }

    const toggleTexturedModel = (function(){
      let modelReference = null,
          initializingModel = false;

      return function(flag){
        if (flag){
          // Need to load model for the first time?
          if (modelReference === null && !initializingModel){

            initializingModel = true;
            const mtlLoader = new THREE.MTLLoader();
            mtlLoader.setTexturePath('/static/app/test/brighton/');
            mtlLoader.setPath('/static/app/test/brighton/');

            mtlLoader.load('odm_textured_model.mtl', function (materials) {
                materials.preload();

                const objLoader = new THREE.OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load('/static/app/test/brighton/odm_textured_model_geo.obj', function (object) {
                    
                    // ODM models are Y-up
                    object.rotateX(THREE.Math.degToRad(-90));

                    // Bring the model close to center
                    if (object.children.length > 0){
                      const geom = object.children[0].geometry;

                      // Compute center
                      geom.computeBoundingBox();

                      const center = geom.boundingBox.getCenter();

                      object.translateX(-center.x);
                      object.translateY(-center.y);
                      object.translateZ(-center.z);
                    } 

                    scenePointCloud.add(object);
                    pointcloud.visible = false;

                    modelReference = object;
                    initializingModel = false;
                });
            });
          }else{
            // Already initialized
            modelReference.visible = true;
            pointcloud.visible = false;
          }
        }else{
          modelReference.visible = false;
          pointcloud.visible = true;
        }
      }
    })();

    const toggleOrigin = (function(){
      let grid = null,
          axisHelper = null;
      return function(flag){
        if (flag){
          if (grid === null){
            grid = Potree.utils.createGrid(5, 5, 2);
            axisHelper = new THREE.AxisHelper( 10 );
            scene.add( grid );
            scene.add( axisHelper );
          }else{
            grid.visible = axisHelper.visible = true;
          }
        }else{
          grid.visible = axisHelper.visible = false;
        }
      };
    })();

    function flipYZ(){
      isFlipYZ = !isFlipYZ;
      
      if(isFlipYZ){
        referenceFrame.matrix.copy(new THREE.Matrix4());
        referenceFrame.applyMatrix(new THREE.Matrix4().set(
          1,0,0,0,
          0,0,1,0,
          0,-1,0,0,
          0,0,0,1
        ));
        
      }else{
        referenceFrame.matrix.copy(new THREE.Matrix4());
        referenceFrame.applyMatrix(new THREE.Matrix4().set(
          1,0,0,0,
          0,1,0,0,
          0,0,1,0,
          0,0,0,1
        ));
      }
      
      referenceFrame.updateMatrixWorld(true);
      pointcloud.updateMatrixWorld();
      var sg = pointcloud.boundingSphere.clone().applyMatrix4(pointcloud.matrixWorld);
      referenceFrame.position.copy(sg.center).multiplyScalar(-1);
      referenceFrame.updateMatrixWorld(true);
      referenceFrame.position.y -= pointcloud.getWorldPosition().y;
      referenceFrame.updateMatrixWorld(true);
    }

    function onKeyDown(event){
      //console.log(event.keyCode);
      
      if(event.keyCode === 69){
        // e pressed
        
        transformationTool.translate();
      }else if(event.keyCode === 82){
        // r pressed
        
        transformationTool.scale();
      }else if(event.keyCode === 84){
        // r pressed
        
        transformationTool.rotate();
      }
    };

    var intensityMax = null;
    var heightMin = null;
    var heightMax = null;

    function update(){
      Potree.pointLoadLimit = pointCountTarget * 2 * 1000 * 1000;
      
      directionalLight.position.copy(camera.position);
      directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));
      
      if(pointcloud){
      
        var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
          
        if(!intensityMax){
          var root = pointcloud.pcoGeometry.root;
          if(root != null && root.loaded){
            var attributes = pointcloud.pcoGeometry.root.geometry.attributes;
            if(attributes.intensity){
              var array = attributes.intensity.array;
              var max = 0;
              for(var i = 0; i < array.length; i++){
                max = Math.max(array[i]);
              }
              
              if(max <= 1){
                intensityMax = 1;
              }else if(max <= 256){
                intensityMax = 255;
              }else{
                intensityMax = max;
              }
            }
          }
        }
        
        if(heightMin === null){
          heightMin = bbWorld.min.y;
          heightMax = bbWorld.max.y;
        }
          
        pointcloud.material.clipMode = clipMode;
        pointcloud.material.heightMin = heightMin;
        pointcloud.material.heightMax = heightMax;
        pointcloud.material.intensityMin = 0;
        pointcloud.material.intensityMax = intensityMax;
        pointcloud.showBoundingBox = showBoundingBox;
        pointcloud.generateDEM = useDEMCollisions;
        pointcloud.minimumNodePixelSize = minNodeSize;
        
        if(!freeze){
          pointcloud.update(camera, renderer);
        }
      }
      
      if(stats && showStats){
        stats.domElement.style.display = 'block';
        stats.update();
      }else if (stats){
        stats.domElement.style.display = 'none';
      }
      
      camera.fov = fov;
      
      if(controls){
        controls.update(clock.getDelta());
      }

      // update progress bar
      if(pointcloud){
        var progress = pointcloud.progress;
        
        progressBar.progress = progress;
        
        var message;
        if(progress === 0 || pointcloud instanceof Potree.PointCloudArena4D){
          message = "loading";
        }else{
          message = "loading: " + parseInt(progress*100) + "%";
        }
        progressBar.message = message;
        
        if(progress === 1){
          progressBar.hide();
        }else if(progress < 1){
          progressBar.show();
        }
      }
      
      volumeTool.update();
      transformationTool.update();
      profileTool.update();
      
      
      var clipBoxes = [];
      
      for(var i = 0; i < profileTool.profiles.length; i++){
        var profile = profileTool.profiles[i];
        
        for(var j = 0; j < profile.boxes.length; j++){
          var box = profile.boxes[j];
          box.updateMatrixWorld();
          var boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
          clipBoxes.push(boxInverse);
        }
      }
      
      for(var i = 0; i < volumeTool.volumes.length; i++){
        var volume = volumeTool.volumes[i];
        
        if(volume.clip){
          volume.updateMatrixWorld();
          var boxInverse = new THREE.Matrix4().getInverse(volume.matrixWorld);
        
          clipBoxes.push(boxInverse);
        }
      }
      
      if(pointcloud){
        pointcloud.material.setClipBoxes(clipBoxes);
      }
    }

    function useEarthControls(){
      if(controls){
        controls.enabled = false;
      }   

      controls = earthControls;
      controls.enabled = true;
    }

    function useFPSControls(){
      if(controls){
        controls.enabled = false;
      }
      if(!fpControls){
        fpControls = new THREE.FirstPersonControls(camera, renderer.domElement);
        fpControls.addEventListener("proposeTransform", function(event){
          if(!pointcloud || !useDEMCollisions){
            return;
          }
          
          var demHeight = pointcloud.getDEMHeight(event.newPosition);
          if(event.newPosition.y < demHeight){
            event.objections++;
            
            var counterProposal = event.newPosition.clone();
            counterProposal.y = demHeight;
            
            event.counterProposals.push(counterProposal);
          }
        });
      }

      controls = fpControls;
      controls.enabled = true;
      
      controls.moveSpeed = pointcloud.boundingSphere.radius / 6;
    }

    function useOrbitControls(){
      if(controls){
        controls.enabled = false;
      }
      if(!orbitControls){
        orbitControls = new Potree.OrbitControls(camera, renderer.domElement);
        orbitControls.addEventListener("proposeTransform", function(event){
          if(!pointcloud || !useDEMCollisions){
            return;
          }
          
          var demHeight = pointcloud.getDEMHeight(event.newPosition);
          if(event.newPosition.y < demHeight){
            event.objections++;
            
            var counterProposal = event.newPosition.clone();
            counterProposal.y = demHeight;
            
            event.counterProposals.push(counterProposal);
          }
        });
      }
      
      controls = orbitControls;
      controls.enabled = true;
      
      if(pointcloud){
        controls.target.copy(pointcloud.boundingSphere.center.clone().applyMatrix4(pointcloud.matrixWorld));
      }
    }

    window.addEventListener("resize", function(){
      width = container.clientWidth;
      height = container.clientHeight;
    });

    var PotreeRenderer = function(){
      this.render = function(){
        var aspect = width / height;
        
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
        

        // render skybox
        if(showSkybox){
          skybox.camera.rotation.copy(camera.rotation);
          renderer.render(skybox.scene, skybox.camera);
        }else{
          renderer.render(sceneBG, cameraBG);
        }
        
        if(pointcloud){
          if(pointcloud.originalMaterial){
            pointcloud.material = pointcloud.originalMaterial;
          }
          
          var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
          
          pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
          pointcloud.material.size = pointSize;
          pointcloud.material.opacity = opacity;
          pointcloud.material.pointColorType = pointColorType;
          pointcloud.material.pointSizeType = pointSizeType;
          pointcloud.material.pointShape = (quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
          pointcloud.material.interpolate = (quality === "Interpolation");
          pointcloud.material.weighted = false;
        }
        
        // render scene
        renderer.render(scene, camera);
        renderer.render(scenePointCloud, camera);
        
        profileTool.render();
        volumeTool.render();
        
        renderer.clearDepth();
        measuringTool.render();
        transformationTool.render();
      };
    };
    var potreeRenderer = new PotreeRenderer();

    // high quality rendering using splats
    var highQualityRenderer = null;
    var HighQualityRenderer = function(){
      var depthMaterial = null;
      var attributeMaterial = null;
      var normalizationMaterial = null;
      
      var rtDepth;
      var rtNormalize;
      
      var initHQSPlats = function(){
        if(depthMaterial != null){
          return;
        }
      
        depthMaterial = new Potree.PointCloudMaterial();
        attributeMaterial = new Potree.PointCloudMaterial();
      
        depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
        depthMaterial.pointShape = Potree.PointShape.CIRCLE;
        depthMaterial.interpolate = false;
        depthMaterial.weighted = false;
        depthMaterial.minSize = 2;
              
        attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
        attributeMaterial.interpolate = false;
        attributeMaterial.weighted = true;
        attributeMaterial.minSize = 2;

        rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, { 
          minFilter: THREE.NearestFilter, 
          magFilter: THREE.NearestFilter, 
          format: THREE.RGBAFormat, 
          type: THREE.FloatType
        } );

        rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, { 
          minFilter: THREE.LinearFilter, 
          magFilter: THREE.NearestFilter, 
          format: THREE.RGBAFormat, 
          type: THREE.FloatType
        } );
        
        var uniformsNormalize = {
          depthMap: { type: "t", value: rtDepth },
          texture: { type: "t", value: rtNormalize }
        };
        
        normalizationMaterial = new THREE.ShaderMaterial({
          uniforms: uniformsNormalize,
          vertexShader: Potree.Shaders["normalize.vs"],
          fragmentShader: Potree.Shaders["normalize.fs"]
        });
      }
      
      var resize = function(width, height){
        if(rtDepth.width == width && rtDepth.height == height){
          return;
        }
        
        rtDepth.dispose();
        rtNormalize.dispose();
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
        rtDepth.setSize(width, height);
        rtNormalize.setSize(width, height);
      };

      // render with splats
      this.render = function(renderer){
        initHQSPlats();
        
        resize(width, height);
        
        
        renderer.clear();
        if(showSkybox){
          skybox.camera.rotation.copy(camera.rotation);
          renderer.render(skybox.scene, skybox.camera);
        }else{
          renderer.render(sceneBG, cameraBG);
        }
        renderer.render(scene, camera);
        
        if(pointcloud){
        
          depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
          attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
        
          pointcloud.visiblePointsTarget = pointCountTarget * 1000 * 1000;
          var originalMaterial = pointcloud.material;
          
          {// DEPTH PASS
            depthMaterial.size = pointSize;
            depthMaterial.pointSizeType = pointSizeType;
            depthMaterial.screenWidth = width;
            depthMaterial.screenHeight = height;
            depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
            depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
            depthMaterial.fov = camera.fov * (Math.PI / 180);
            depthMaterial.spacing = pointcloud.pcoGeometry.spacing;
            depthMaterial.near = camera.near;
            depthMaterial.far = camera.far;
            depthMaterial.heightMin = heightMin;
            depthMaterial.heightMax = heightMax;
            depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
            depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
            depthMaterial.bbSize = pointcloud.material.bbSize;
            depthMaterial.treeType = pointcloud.material.treeType;
            
            scenePointCloud.overrideMaterial = depthMaterial;
            renderer.clearTarget( rtDepth, true, true, true );
            renderer.render(scenePointCloud, camera, rtDepth);
            scenePointCloud.overrideMaterial = null;
          }
          
          {// ATTRIBUTE PASS
            attributeMaterial.size = pointSize;
            attributeMaterial.pointSizeType = pointSizeType;
            attributeMaterial.screenWidth = width;
            attributeMaterial.screenHeight = height;
            attributeMaterial.pointColorType = pointColorType;
            attributeMaterial.depthMap = rtDepth;
            attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
            attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.size().x;
            attributeMaterial.fov = camera.fov * (Math.PI / 180);
            attributeMaterial.spacing = pointcloud.pcoGeometry.spacing;
            attributeMaterial.near = camera.near;
            attributeMaterial.far = camera.far;
            attributeMaterial.heightMin = heightMin;
            attributeMaterial.heightMax = heightMax;
            attributeMaterial.intensityMin = pointcloud.material.intensityMin;
            attributeMaterial.intensityMax = pointcloud.material.intensityMax;
            attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
            attributeMaterial.clipMode = pointcloud.material.clipMode;
            attributeMaterial.bbSize = pointcloud.material.bbSize;
            attributeMaterial.treeType = pointcloud.material.treeType;
            
            scenePointCloud.overrideMaterial = attributeMaterial;
            renderer.clearTarget( rtNormalize, true, true, true );
            renderer.render(scenePointCloud, camera, rtNormalize);
            scenePointCloud.overrideMaterial = null;
          }
          
          {// NORMALIZATION PASS
            normalizationMaterial.uniforms.depthMap.value = rtDepth;
            normalizationMaterial.uniforms.texture.value = rtNormalize;
            Potree.utils.screenPass.render(renderer, normalizationMaterial);
          }
          
          pointcloud.material = originalMaterial;
            
          volumeTool.render();
          renderer.clearDepth();
          profileTool.render();
          measuringTool.render();
          transformationTool.render();
        }


      }
    };

    function loop() {
      requestAnimationFrame(loop);
      update();
      
      if(quality === "Splats"){
        if(!highQualityRenderer){
          highQualityRenderer = new HighQualityRenderer();
        }
        highQualityRenderer.render(renderer);
      }else{
        potreeRenderer.render();
      }
    };



    initThree();
    loop();
  }

  // React render
  render(){
    return (<div className="model-view">
          <div 
            className="container"
            ref={(domNode) => { this.container = domNode; }}
            style={{height: "100%", width: "100%"}} 
            onContextMenu={(e) => {e.preventDefault();}}></div>
      </div>);
  }
}

export default ModelView;
