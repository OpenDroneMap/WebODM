import React from 'react';
import PropTypes from 'prop-types';
import { systems, getPreferredUnitSystem, setPreferredUnitSystem } from '../classes/Units';
import '../css/UnitSelector.scss';

class UnitSelector extends React.Component {
  static propTypes = {
  }

  constructor(props){
    super(props);

    this.state = {
        system: getPreferredUnitSystem()
    }
  }
  
  handleChange = e => {
    this.setState({system: e.target.value});
    setPreferredUnitSystem(e.target.value);
  };

  render() {
    return (
      <select className="unit-selector" value={this.state.system} onChange={this.handleChange}>
            {Object.keys(systems).map(k => 
                <option value={k} key={k}>{systems[k].getName()}</option>)}
        </select>
    );
  }
}

export default UnitSelector;
