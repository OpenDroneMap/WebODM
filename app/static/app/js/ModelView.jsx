import React from 'react';
import './css/ModelView.scss';
import $ from 'jquery';

const THREE = require('three'); // import does not work :/
require('./vendor/OBJLoader');
THREE.OrbitControls = require('three-orbit-controls')(THREE);
THREE.MTLLoader = require('three-mtl-loader');

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
    var container;
    var camera, controls, scene, renderer;
    var lighting, ambient, keyLight, fillLight, backLight;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;

    const init = () => {
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
      camera.position.z = 3;

      scene = new THREE.Scene();
      ambient = new THREE.AmbientLight(0xFFFFFF, 1.0);
      scene.add(ambient);

      var mtlLoader = new THREE.MTLLoader();
      mtlLoader.setTexturePath('/static/app/test/');
      mtlLoader.setPath('/static/app/test/');
      mtlLoader.load('odm_textured_model.mtl', function (materials) {
          materials.preload();


          const objLoader = new THREE.OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load('/static/app/test/odm_textured_model.obj', function (object) {
              scene.add(object);
              console.log(object);
          });
      });

      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize($(this.canvas).width(), $(this.canvas).height());

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.2;
      controls.enableZoom = true;

      this.canvas.appendChild(renderer.domElement);
    };

    function render() {
      requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    }

    init();
    render();
  }

  // React render
  render(){
    return (<div className="model-view">
          <div 
            ref={(domNode) => { this.canvas = domNode; }}
            style={{height: "100%", width: "100%"}} 
            onContextMenu={(e) => {e.preventDefault();}}></div>
      </div>);
  }
}

export default ModelView;
