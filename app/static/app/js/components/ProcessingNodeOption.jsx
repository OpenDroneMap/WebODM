import React from 'react';
import '../css/ProcessingNodeOption.scss';
import $ from 'jquery';

class ProcessingNodeOption extends React.Component {
  constructor(props){
    super();

    this.state = {
      value: ""
    };

    this.resetToDefault = this.resetToDefault.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
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

  handleCheckboxChange(e){
    this.setState({value: this.state.value === "" ? true : ""});
  }

  render() {
    let inputControl = "";
    if (this.props.type !== 'bool'){
      inputControl = (
          <input type="text" 
            className="form-control"
            placeholder={this.props.value}
            value={this.state.value}
            onChange={this.handleInputChange} />
        );
    }else{
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
        <label>{this.props.name} {(this.props.domain ? `(${this.props.domain})` : "")}</label><br/>
        {inputControl}
        <button type="submit" className="btn glyphicon glyphicon-info-sign btn-info" data-toggle="tooltip" data-placement="top" title={this.props.help} onClick={e => e.preventDefault()}></button>
        <button type="submit" className="btn glyphicon glyphicon glyphicon-repeat btn-default" data-toggle="tooltip" data-placement="top" title="Reset to default" onClick={this.resetToDefault}></button>
      </div>
    );
  }
}

export default ProcessingNodeOption;
