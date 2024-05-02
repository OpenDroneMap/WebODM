import React from 'react';
import PropTypes from 'prop-types';

class UnitSelector extends React.Component {
  static propTypes = {
  }

  constructor(props){
    super(props);

    this.state = {
        system: window.getPreferredUnitSystem()
    }
  }
  
  handleChange = e => {
    this.setState({system: e.target.value});
    window.setPreferredUnitSystem(e.target.value);
  };

  render() {
    return (
      <select value={this.state.system} onChange={this.handleChange}>
            <option value="metric" key={}></option>
        </select>
    );
  }
}

export default UnitSelector;
