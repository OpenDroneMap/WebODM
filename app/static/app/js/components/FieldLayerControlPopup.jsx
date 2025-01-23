import React from 'react';
import ReactDOM from 'react-dom';
import L, { bounds } from 'leaflet';
import PropTypes from 'prop-types';
import '../css/FieldLayerControlPopup.scss';
import update from 'immutability-helper';

class FieldLayerControlPopup extends React.Component {
  static propTypes = {
    aiTypes: PropTypes.array.isRequired,
    boundLayer: PropTypes.object.isRequired,
    stateSelectedLayers: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    this.boundLayer = this.props.boundLayer;
    this.handleOnChangeAi = this.handleOnChangeAi.bind(this);
    this.changeLayerColor = this.changeLayerColor.bind(this);
    this.handleOnChangeRadio = this.handleOnChangeRadio.bind(this);

    // checkboxLabel: the label that appears with the checkbox when the detections popup is opened. (Optional)
    this.aiOptions = [
      {
        checkboxLabel: "Daninha",
        category: 'weed',
      },
    ];

    // checkboxLabel: the label that appears with the checkbox when the detections popup is opened. (Optional)
    // fieldColor: Color that should appear in the geojson if the checkbox was selected
    this.cropType = [
      {
        checkboxLabel: "Milho",
        type: 'corn',
        fieldColor: '#F4D35E',
      },
      {
        checkboxLabel: "Soja",
        type: 'soy',
        fieldColor: '#2E1E0F',
      },
      {
        checkboxLabel: "Cana",
        type: 'cane',
        fieldColor: '#596F62',
      },
    ];

    this.checked = {};
    this.aiOptions.forEach(option => {
      this.checked[option.category] = false;
    });

    this.state = {
      cropType: null,
      isChecked: false,
      isPulverize: false,
      isPolinomialHealth: false,
    };

    this.getSelectedLayers = this.props.stateSelectedLayers[0];
    this.setSelectedLayers = this.props.stateSelectedLayers[1];

    this.selectedIndex = this.getSelectedLayers().length;
    this.setSelectedLayers(this.getSelectedLayers().length, {
      bounds: this.boundLayer.getBounds(),
      cropType: null,
      aiOptions: new Set(),
      pulverize: false,
      polynomialHealth: false
    });

  }

  handleOnChangePulverize() {
    const newPulverizeState = !this.state.isPulverize;
    this.setState({ isPulverize: newPulverizeState });


    this.setSelectedLayers(this.selectedIndex, update(this.getSelectedLayers()[this.selectedIndex], {
      $merge: { pulverize: newPulverizeState }
    }));
  }


  handleOnChangePolinomialHealth() {

    const newPolinomiaHealthState = !this.state.isPolinomialHealth;
    this.setState({ isPolinomialHealth: newPolinomiaHealthState });

    this.setSelectedLayers(this.selectedIndex, update(this.getSelectedLayers()[this.selectedIndex], {
      $merge: { polynomialHealth: newPolinomiaHealthState }
    }))
  }


  handleCheck(category) {

    this.setState({ isChecked: !this.state.isChecked });
    this.handleOnChangeAi(category);
  }

  changeLayerColor(color) {
    this.boundLayer.setStyle({ color: color });
  }

  handleOnChangeAi(id) {
    this.checked[id] = !this.checked[id];

    if (this.checked[id]) {
      this.setSelectedLayers(this.selectedIndex, update(this.getSelectedLayers()[this.selectedIndex], { aiOptions: { $add: [id] } }));
    }
    else {
      this.setSelectedLayers(this.selectedIndex, update(this.getSelectedLayers()[this.selectedIndex], { aiOptions: { $remove: [id] } }));
    }
  }

  handleOnChangeRadio(id) {
    this.setSelectedLayers(this.selectedIndex, update(this.getSelectedLayers()[this.selectedIndex], { $merge: { cropType: id } }));
    this.setState({ cropType: id });
    let color;

    for (let i = 0; i < this.cropType.length; i++) {
      if (this.cropType[i].type == id) {
        color = this.cropType[i].fieldColor;
        break;
      }
    }

    this.changeLayerColor(color);
  }

  render() {
    return (
      <div className='field-layer'>
        {/* <h1>{names[this.selectedIndex] + ` - Layer ${this.selectedIndex}` || `Layer ${this.selectedIndex}`}</h1> */}
        <h1>
          {this.getSelectedLayers()[this.selectedIndex].name
            ?
            <div>
              <span className='NameField'> {this.getSelectedLayers()[this.selectedIndex].name} </span>
              <span className='vertical-bar'></span>
              <span> Layer {this.selectedIndex} </span>
            </div>
            :
            <span>
              Layer {this.selectedIndex}
            </span>}
        </h1>

        <fieldset>
          <legend>TIPO DE CULTIVO</legend>
          {
            this.cropType.map((typ, index) => {
              const lastTyp = this.cropType.length - 1 !== index
              return (
                <div className="croType-container" key={typ.type}>
                  <div onClick={() => this.handleOnChangeRadio(typ.type)} style={{ cursor: "pointer" }}>
                    <i className={this.state.cropType === typ.type ? "fas fa-check-circle" : "far fa-circle"}></i>
                    <label htmlFor={typ.type} style={{ cursor: "pointer" }}>
                      {typ.checkboxLabel}
                    </label>
                  </div>
                  {lastTyp ? <span className='horizontal-bar'></span> : ""}
                </div>
              )
            })
          }
        </fieldset>

        <p className='IAprocess-info'>IAs para processar</p>
        {
          this.aiOptions.map(option => {
            return (
              <div className='IAprocess-container' key={option.category} onClick={() => this.handleCheck(option.category)}>
                <i className={this.state.isChecked ? "fas fa-check-square" : "far fa-square"} id={option.category}></i>
                <label htmlFor={option.category} style={{ cursor: "pointer" }} > {option.checkboxLabel}</label>
              </div>

            )
          })
        }

        <p className='IAprocess-info'>Saúde Polinomial </p>

        <div className='IAprocess-container' onClick={() => this.handleOnChangePolinomialHealth()}>
          <i className={this.state.isPolinomialHealth ? "fas fa-check-square" : "far fa-square"}></i>
          <label style={{ cursor: "pointer" }}>Saúde polinomial</label>
        </div>

        <p className='IAprocess-info'>Pulverização</p>

        <div className='IAprocess-container' onClick={() => this.handleOnChangePulverize()}>
          <i className={this.state.isPulverize ? "fas fa-check-square" : "far fa-square"}></i>
          <label htmlFor="pulverize" style={{ cursor: "pointer" }}> Pulverizar</label>
        </div>


      </div>)
  }
}

export default function createFieldLayerControlPopup(aiTypes, boundLayer, stateSelectedLayers) {
  let container = L.DomUtil.create('div');
  ReactDOM.render(<FieldLayerControlPopup aiTypes={aiTypes} boundLayer={boundLayer} stateSelectedLayers={stateSelectedLayers} />, container);
  return container;
}
