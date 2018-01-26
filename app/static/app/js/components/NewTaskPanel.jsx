import '../css/NewTaskPanel.scss';
import React from 'react';
import EditTaskForm from './EditTaskForm';
import PropTypes from 'prop-types';
import Storage from '../classes/Storage';

class NewTaskPanel extends React.Component {
  static defaultProps = {
    name: "",
    filesCount: 0,
    showResize: false
  };

  static propTypes = {
      onSave: PropTypes.func.isRequired,
      onCancel: PropTypes.func,
      name: PropTypes.string,
      filesCount: PropTypes.number,
      showResize: PropTypes.bool
  };

  constructor(props){
    super(props);

    this.state = {
      name: props.name,
      editTaskFormLoaded: false,
      resize: Storage.getItem('do_resize') !== null ? Storage.getItem('do_resize') == "1" : true,
      resizeSize: parseInt(Storage.getItem('resize_size')) || 2048
    };

    this.save = this.save.bind(this);
    this.handleFormTaskLoaded = this.handleFormTaskLoaded.bind(this);
    this.getTaskInfo = this.getTaskInfo.bind(this);
    this.setResize = this.setResize.bind(this);
    this.handleResizeSizeChange = this.handleResizeSizeChange.bind(this);
  }

  save(e){
    e.preventDefault();
    this.taskForm.saveLastPresetToStorage();
    Storage.setItem('resize_size', this.state.resizeSize);
    Storage.setItem('do_resize', this.state.resize ? "1" : "0");
    if (this.props.onSave) this.props.onSave(this.getTaskInfo());
  }

  cancel = (e) => {
    if (this.props.onCancel){
      if (window.confirm("Are you sure you want to cancel?")){
        this.props.onCancel();
      }
    }
  }

  getTaskInfo(){
    return Object.assign(this.taskForm.getTaskInfo(), {
      resizeTo: (this.state.resize && this.state.resizeSize > 0) ? this.state.resizeSize : null
    });
  }

  setResize(flag){
    return e => {
      this.setState({resize: flag});
    }
  }

  handleResizeSizeChange(e){
    // Remove all non-digit characters
    let n = parseInt(e.target.value.replace(/[^\d]*/g, ""));
    if (isNaN(n)) n = "";
    this.setState({resizeSize: n});
  }

  handleFormTaskLoaded(){
    this.setState({editTaskFormLoaded: true});
  }

  render() {
    return (
      <div className="new-task-panel theme-background-highlight">
        <div className="form-horizontal">
          <p>{this.props.filesCount} files selected. Please check these additional options:</p>
          <EditTaskForm
            onFormLoaded={this.handleFormTaskLoaded}
            ref={(domNode) => { if (domNode) this.taskForm = domNode; }}
          />

          {this.state.editTaskFormLoaded ?
            <div className="form-group">
              <label className="col-sm-2 control-label">Resize Images</label>
              <div className="col-sm-10">
                <div className="btn-group">
                  <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown">
                    {this.state.resize ? 
                     "Yes" : "Skip"} <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <a href="javascript:void(0);" 
                          onClick={this.setResize(true)}>
                          <i style={{opacity: this.state.resize ? 1 : 0}} className="fa fa-check"></i> Yes</a>
                    </li>
                    <li>
                      <a href="javascript:void(0);" 
                          onClick={this.setResize(false)}>
                          <i style={{opacity: !this.state.resize ? 1 : 0}} className="fa fa-check"></i> Skip</a>
                    </li>
                  </ul>
                </div>
                <div className={"resize-control " + (!this.state.resize ? "hide" : "")}>
                  <input 
                    type="number" 
                    step="100"
                    className="form-control"
                    onChange={this.handleResizeSizeChange} 
                    value={this.state.resizeSize} 
                  />
                  <span>px</span>
                </div>
              </div>
            </div>
          : ""}

          {this.state.editTaskFormLoaded ? 
            <div className="form-group">
              <div className="col-sm-offset-2 col-sm-10 text-right">
                {this.props.onCancel !== undefined && <button type="submit" className="btn btn-danger" onClick={this.cancel} style={{marginRight: 4}}><i className="glyphicon glyphicon-remove-circle"></i> Cancel</button>}
                <button type="submit" className="btn btn-primary" onClick={this.save}><i className="glyphicon glyphicon-saved"></i> Start Processing</button>
              </div>
            </div>
            : ""}
        </div>
      </div>
    );
  }
}

export default NewTaskPanel;
