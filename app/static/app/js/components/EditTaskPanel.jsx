import '../css/EditTaskPanel.scss';
import React from 'react';

class EditTaskPanel extends React.Component {
  constructor(){
    super();

    this.namePlaceholder = "Task of " + (new Date()).toISOString();

    this.state = {
      name: "",
      advancedOptions: false
    };

    this.handleNameChange = this.handleNameChange.bind(this);
    this.setAdvancedOptions = this.setAdvancedOptions.bind(this);
    this.save = this.save.bind(this);
  }

  handleNameChange(e){
    this.setState({name: e.target.value});
  }

  setAdvancedOptions(flag){
    return () => {
      this.setState({advancedOptions: flag});
    };
  }

  save(){

  }

  render() {
    return (
      <div className="edit-task-panel">
        <form className="form-horizontal">
          <p>Your images are being uploaded. In the meanwhile, set these additional options:</p>
          <div className="form-group">
            <label className="col-sm-2 control-label">Name</label>
            <div className="col-sm-10">
              <input type="text" onChange={this.handleNameChange} className="form-control" placeholder={this.namePlaceholder} />
            </div>
          </div>
          <div className="form-group">
            <label className="col-sm-2 control-label">Processing Node</label>
              <div className="col-sm-10">
                <select className="form-control">
                  <option>Auto</option>
                  <option>1</option>
                  <option>2</option>
                </select>
              </div>
          </div>
          <div className="form-group">
            <label className="col-sm-2 control-label">Options</label>
            <div className="col-sm-10">
              <div className="btn-group" role="group">
                <button type="button" className={"btn " + (!this.state.advancedOptions ? "btn-default" : "btn-secondary")} onClick={this.setAdvancedOptions(false)}>Default</button>
                <button type="button" className={"btn " + (this.state.advancedOptions ? "btn-default" : "btn-secondary")} onClick={this.setAdvancedOptions(true)}>Advanced</button>
              </div>
            </div>
          </div>
          <div className="form-group">
            <div className="col-sm-offset-2 col-sm-10 text-right">
              <button type="submit" className="btn btn-default" onClick={this.save}>Save</button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}

export default EditTaskPanel;
