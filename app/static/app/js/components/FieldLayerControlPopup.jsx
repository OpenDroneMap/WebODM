import React from 'react';
import ReactDOM from 'react-dom';
import L, { bounds } from 'leaflet';
import PropTypes from 'prop-types';
import '../css/FieldLayerControlPopup.scss';
import update from 'immutability-helper';

class FieldLayerControlPopup extends React.Component {
  static propTypes = {
    aiTypes: PropTypes.array.isRequired,
    boundLayer: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.checked = {};
    this.props.aiTypes.forEach(typ => {
      this.checked[typ.type] = false;
    });

    this.boundLayer = this.props.boundLayer;
    this.boundLayer.options.processing = new Set();
    this.handleOnChange = this.handleOnChange.bind(this);
    this.changeLayerColor = this.changeLayerColor.bind(this);
    this.updateColorSchema = this.updateColorSchema.bind(this);
  }

  convertToHex(integer) {
    const hexString = integer.toString(16);

    return hexString.length === 1 ? "0" + hexString : hexString;
}

  // By: Aaron Harris (https://stackoverflow.com/questions/14819058/mixing-two-colors-naturally-in-javascript)
  //colorChannelA and colorChannelB are ints ranging from 0 to 255
  colorChannelMixer(colorChannelA, colorChannelB, amountToMix){
    let channelA = colorChannelA*amountToMix;
    let channelB = colorChannelB*(1-amountToMix);
    return parseInt(channelA+channelB);
  }

  //rgbA and rgbB are arrays, amountToMix ranges from 0.0 to 1.0
  //example (red): rgbA = [255,0,0]
  colorMixer(rgbA, rgbB, amountToMix){
    let r = this.colorChannelMixer(rgbA[0],rgbB[0],amountToMix);
    let g = this.colorChannelMixer(rgbA[1],rgbB[1],amountToMix);
    let b = this.colorChannelMixer(rgbA[2],rgbB[2],amountToMix);
    return [r, g, b];
  }

  colorFromComponents(color) {
    let r = this.convertToHex(color[0]);
    let g = this.convertToHex(color[1]);
    let b = this.convertToHex(color[2]);

    return `#${r}${g}${b}`;
  }

  changeLayerColor(color) {
    this.boundLayer.setStyle({color: color});
  }

  updateColorSchema() {
    let colorToBeMixed = [];
     this.boundLayer.options.processing.forEach((id) => {
      for (let i = 0; i < this.props.aiTypes.length; i++) {
        if (this.props.aiTypes[i].type == id) {
          colorToBeMixed.push(this.props.aiTypes[i].fieldColor);
        }
      }
    });

    colorToBeMixed = colorToBeMixed.sort();

    if (colorToBeMixed.length == 0) {
      this.changeLayerColor('#99ff99');
      return;
    }

    if (colorToBeMixed.length == 1) {
      this.changeLayerColor(this.colorFromComponents(colorToBeMixed[0]));
      return;
    }
    
    const mixingConstant = 0.5;

    let clr = this.colorMixer(colorToBeMixed[0], colorToBeMixed[1], mixingConstant);
    for (let i = 2; i < colorToBeMixed.length; i++) {
      clr = this.colorMixer(clr, colorToBeMixed[i], mixingConstant);
    }

    this.changeLayerColor(this.colorFromComponents(clr));
  }

  handleOnChange(id) {
    this.checked[id] = !this.checked[id];

    if (this.checked[id]) {
      this.boundLayer.options.processing.add(id);
    }
    else {
      this.boundLayer.options.processing.delete(id);
    }
    this.updateColorSchema();
  }

  render() {
    return (
    <div className='field-layer'>
        {
            this.props.aiTypes.map(typ => {
                if (!typ.checkboxSelectable)
                    return null;

                return (<div key={typ.type}>
                    <input type='checkbox' id={typ.type} onChange={() => this.handleOnChange(typ.type)}></input>
                    <label htmlFor={typ.type}>{typ.checkboxLabel}</label>
                </div>)
            })
        }
    </div>)
  }
}

export default function createFieldLayerControlPopup(aiTypes, boundLayer)
{
  let container = L.DomUtil.create('div');
  ReactDOM.render(<FieldLayerControlPopup aiTypes={aiTypes} boundLayer={boundLayer}/>, container);
  return container;
}
