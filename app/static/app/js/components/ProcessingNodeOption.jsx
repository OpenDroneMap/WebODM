import React from 'react';
import '../css/ProcessingNodeOption.scss';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ProcessingNodeOption extends React.Component {
  static defaultProps = {};

  static propTypes = {
    name: PropTypes.string.isRequired,
    defaultValue: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.bool
    ]).isRequired,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.bool
    ]),
    type: PropTypes.string,
    domain: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array
    ]),
    help: PropTypes.string,
  };

  constructor(props){
    super();

    this.state = {
      value: props.value !== undefined ? props.value : ""
    };

    this.resetToDefault = this.resetToDefault.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.isEnumType = this.isEnumType.bind(this);
  }

  getValue(){
    return this.state.value !== "" ? this.state.value : undefined;
  }

  setTooltips(domNode){
    if (domNode !== null) $(domNode).children('[data-toggle="tooltip"]').tooltip();
  }

  resetToDefault(e){
    this.setState({value: ""});
    e.preventDefault();
  }

  handleInputChange(e){
    this.setState({value: e.target.value});
  }

  handleSelectChange(e){
    this.setState({value: this.state.value !== this.props.defaultValue ? e.target.value : ""});
  }

  handleCheckboxChange(e){
    this.setState({value: this.state.value === "" ? true : ""});
  }

  isEnumType(){
    return this.props.type === 'enum' && Array.isArray(this.props.domain);
  }

  render() {
    let inputControl = "";
    if (this.props.type !== 'bool'){
      if (this.isEnumType()){
        // Enum
        let selectValue = this.state.value !== "" ? 
                          this.state.value : 
                          this.props.defaultValue; 
        inputControl = (
            <select
              className="form-control"
              value={selectValue}
              onChange={this.handleSelectChange}>
                {this.props.domain.map(val => 
                  <option value={val} key={val}>{val}</option>
                )}
            </select>
          );
      }else{
        // String, numbers, etc.
        inputControl = (
            <input type="text" 
              className="form-control"
              placeholder={this.props.defaultValue}
              value={this.state.value}
              onChange={this.handleInputChange} />
          );
      }
    }else{
      // Boolean
      inputControl = (
          <div className="checkbox">
            <label>
              <input type="checkbox"
                    checked={this.state.value !== ""}
                    onChange={this.handleCheckboxChange} /> Enable
            </label>
          </div>
        );
    }

    return (
      <div className="processing-node-option form-inline form-group form-horizontal" ref={this.setTooltips}>
        <label>{this.props.name} {(!this.isEnumType() && this.props.domain ? `(${this.props.domain})` : "")}</label><br/>
        {inputControl}
        <button type="submit" className="btn glyphicon glyphicon-info-sign btn-primary" data-toggle="tooltip" data-placement="left" title={this.props.help} onClick={e => e.preventDefault()}></button>
        <button type="submit" className="btn glyphicon glyphicon glyphicon-repeat btn-default" data-toggle="tooltip" data-placement="top" title="Reset to default" onClick={this.resetToDefault}></button>
      </div>
    );
  }
}

export default ProcessingNodeOption;
