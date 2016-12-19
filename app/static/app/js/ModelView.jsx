import React from 'react';
import './css/ModelView.scss';
import {osgDB, osgGA, osgViewer, osg, CADManipulator} from './vendor/osgjs/OSG';

class ModelView extends React.Component {
  static defaultProps = {
    test: 0
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
    this.viewer = new osgViewer.Viewer(this.canvas);
    this.viewer.init();
            
    const node = new osg.MatrixTransform();

    this.viewer.setSceneData( node );
    this.viewer.setupManipulator(new osgGA.CADManipulator());
    this.viewer.getManipulator().computeHomePosition();
    this.viewer.run();

    let request = osgDB.readNodeURL( '/static/app/test/test.osgjs' );
    request.then( function ( model ) {
        node.addChild(model);
        this.viewer.getManipulator().computeHomePosition();
    }.bind( this ) );
  }

  render(){
    return (<div className="model-view">
          <canvas 
            ref={(domNode) => { this.canvas = domNode; }}
            style={{height: "100%", width: "100%"}} 
            onContextMenu={(e) => {e.preventDefault();}}></canvas>
      </div>);
  }
}

export default ModelView;
