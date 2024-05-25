import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox, ExpandButton } from './Toggle';

export default class LayersControlItem extends React.Component {
  static defaultProps = {
    expanded: true,
    visible: true

};
  static propTypes = {
    expanded: PropTypes.bool,
    visible: PropTypes.bool,
    icon: PropTypes.string,
    label: PropTypes.string,
    layers: PropTypes.array
}

  constructor(props){
    super(props);

    this.state = {
        visible: props.visible,
        expanded: props.expanded
    };
  }


  handleLayerClick = () => {
    console.log("TODO")
  }

  render(){
    const { label, icon } = this.props;

    return (<div className="layers-control-layer">
        <div className="layer-control-title">
          <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/>
          <a title={label} className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}><div className="layer-title">{icon ? <i className={"layer-icon " + icon}></i> : ""} {label}</div></a>
        </div>

        {this.state.expanded ? 
        <div className="layer-expanded">
            test
        </div> : ""}
    </div>);

   }
}