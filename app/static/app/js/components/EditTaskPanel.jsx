import '../css/EditTaskPanel.scss';
import React from 'react';
import EditTaskForm from './EditTaskForm';

class EditTaskPanel extends React.Component {
  static defaultProps = {
    uploading: false,
    name: ""
  };

  static propTypes = {
      onSave: React.PropTypes.func.isRequired,
      name: React.PropTypes.string,
      uploading: React.PropTypes.bool
  };

  constructor(props){
    super(props);

    this.state = {
      name: props.name,
      editing: true,
      editTaskFormLoaded: false
    };

    this.save = this.save.bind(this);
    this.edit = this.edit.bind(this);
    this.handleFormTaskLoaded = this.handleFormTaskLoaded.bind(this);
    this.getTaskInfo = this.getTaskInfo.bind(this);
  }

  save(e){
    e.preventDefault();
    this.setState({editing: false});
    if (this.props.onSave) this.props.onSave(this.getTaskInfo());
  }

  getTaskInfo(){
    return this.taskForm.getTaskInfo();
  }

  edit(e){
    e.preventDefault();
    this.setState({editing: true});
  }

  handleFormTaskLoaded(){
    this.setState({editTaskFormLoaded: true});
  }

  render() {
    if (this.props.uploading || this.state.editing){
      // Done editing, but still uploading
      return (
        <div className="edit-task-panel">
          <form className={"form-horizontal " + (this.state.editing ? "" : "hide")}>
            <p>{this.props.uploading ? 
              "Your images are being uploaded. In the meanwhile, check these additional options:"
            : "Please check these additional options:"}</p>
            <EditTaskForm
              onFormLoaded={this.handleFormTaskLoaded}
              ref={(domNode) => { if (domNode) this.taskForm = domNode; }}
            />
            {this.state.editTaskFormLoaded ? 
              <div className="form-group">
                <div className="col-sm-offset-2 col-sm-10 text-right">
                  <button type="submit" className="btn btn-primary" onClick={this.save}><i className="glyphicon glyphicon-saved"></i> {this.props.uploading ? "Save" : "Start Processing"}</button>
                </div>
              </div>
              : ""}
          </form>

          <div className={"pull-right " + (!this.state.editing ? "" : "hide")}>
            <button type="submit" className="btn btn-primary btn-sm glyphicon glyphicon-pencil" onClick={this.edit}></button>
          </div>
          <p className={"header " + (!this.state.editing ? "" : "hide")}><strong>Thank you!</strong> Please wait for the upload to complete.</p>
        </div>
      );
    }else{
      return (<div><i className="fa fa-refresh fa-spin fa-fw"></i></div>);
    }
  }
}

export default EditTaskPanel;
