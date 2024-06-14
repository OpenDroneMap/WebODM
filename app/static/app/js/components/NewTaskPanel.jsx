import '../css/NewTaskPanel.scss';
import React from 'react';
import EditTaskForm from './EditTaskForm';
import PropTypes from 'prop-types';
import Storage from '../classes/Storage';
import ResizeModes from '../classes/ResizeModes';
import update from 'immutability-helper';
import PluginsAPI from '../classes/plugins/API';
import { _, interpolate } from '../classes/gettext';

class NewTaskPanel extends React.Component {
  static defaultProps = {
    filesCount: 0,
    showResize: false
  };

  static propTypes = {
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    filesCount: PropTypes.number,
    showResize: PropTypes.bool,
    getFiles: PropTypes.func,
    suggestedTaskName: PropTypes.oneOfType([PropTypes.string, PropTypes.func])
  };

  constructor(props) {
    super(props);

    this.state = {
      editTaskFormLoaded: false,
      resizeMode: Storage.getItem('resize_mode') === null ? ResizeModes.YES : ResizeModes.fromString(Storage.getItem('resize_mode')),
      resizeSize: parseInt(Storage.getItem('resize_size')) || 2048,
      items: [], // Coming from plugins,
      taskInfo: {},
      inReview: false,
      currentStep: "settingsStep",
      loading: false,
    };

    this.save = this.save.bind(this);
    this.handleFormTaskLoaded = this.handleFormTaskLoaded.bind(this);
    this.getTaskInfo = this.getTaskInfo.bind(this);
    this.setResizeMode = this.setResizeMode.bind(this);
    this.handleResizeSizeChange = this.handleResizeSizeChange.bind(this);
    this.handleFormChanged = this.handleFormChanged.bind(this);
  }

  componentDidMount() {
    PluginsAPI.Dashboard.triggerAddNewTaskPanelItem({}, (item) => {
      if (!item) return;

      this.setState(update(this.state, {
        items: { $push: [item] }
      }));
    });
  }

  save(e) {
    if (!this.state.inReview) {
      this.setState({ inReview: true });
    } else {
      this.setState({ inReview: false, loading: true });
      e.preventDefault();
      this.taskForm.saveLastPresetToStorage();
      Storage.setItem('resize_size', this.state.resizeSize);
      Storage.setItem('resize_mode', this.state.resizeMode);

      const taskInfo = this.getTaskInfo();
      if (taskInfo.selectedNode.key != "auto") {
        Storage.setItem('last_processing_node', taskInfo.selectedNode.id);
      } else {
        Storage.setItem('last_processing_node', '');
      }

      if (this.props.onSave) this.props.onSave(taskInfo);
    }

    this.setState({ currentStep: "aiStep" });
  }

  cancel = (e) => {
    if (this.state.inReview) {
      this.setState({ inReview: false });
    } else {
      if (this.props.onCancel) {
        if (window.confirm(_("Are you sure you want to cancel?"))) {
          this.props.onCancel();
        }
      }
    }
    this.setState({ currentStep: "settingsStep" });
  }

  getTaskInfo() {
    return Object.assign(this.taskForm.getTaskInfo(), {
      resizeSize: this.state.resizeSize,
      resizeMode: this.state.resizeMode
    });
  }

  setResizeMode(v) {
    return e => {
      this.setState({ resizeMode: v });

      setTimeout(() => {
        this.handleFormChanged();
      }, 0);
    }
  }

  handleResizeSizeChange(e) {
    // Remove all non-digit characters
    let n = parseInt(e.target.value.replace(/[^\d]*/g, ""));
    if (isNaN(n)) n = "";
    this.setState({ resizeSize: n });

    setTimeout(() => {
      this.handleFormChanged();
    }, 0);
  }

  handleFormTaskLoaded() {
    this.setState({ editTaskFormLoaded: true });
  }

  handleFormChanged() {
    this.setState({ taskInfo: this.getTaskInfo() });
  }

  render() {
    let filesCountOk = true;
    if (this.taskForm && !this.taskForm.checkFilesCount(this.props.filesCount)) filesCountOk = false;

    return (
      <div className="new-task-panel theme-background-highlight">
        <div className="form-horizontal">
          <div>
            <p className='files-text'>{interpolate(_("%(count)s files selected. Please check these additional options:"), { count: this.props.filesCount })}</p>

            {!filesCountOk ?
              <div className="alert alert-warning">
                {interpolate(_("Number of files selected exceeds the maximum of %(count)s allowed on this processing node."), { count: this.taskForm.selectedNodeMaxImages() })}
                <button onClick={this.props.onCancel} type="button" className="btn btn-xs btn-primary redo">
                  <span><i className="glyphicon glyphicon-remove-circle"></i> {_("Cancel")}</span>
                </button>
              </div>
              : ""}

            <EditTaskForm
              selectedNode={Storage.getItem("last_processing_node") || "auto"}
              onFormLoaded={this.handleFormTaskLoaded}
              onFormChanged={this.handleFormChanged}
              inReview={this.state.inReview}
              currentStep={this.state.currentStep}
              suggestedTaskName={this.props.suggestedTaskName}
              ref={(domNode) => { if (domNode) this.taskForm = domNode; }}
            />

            {this.state.editTaskFormLoaded && this.props.showResize && this.state.currentStep !== "aiStep" ?
              <div>
                <div className="form-group resize-images-container">
                  <label className="col-sm-2 control-label">{_("Resize Images")}</label>
                  <div className="col-sm-10">
                    <div className="btn-group">
                      <button type="button" className="btn btn-default-s dropdown-toggle" data-toggle="dropdown">
                        {ResizeModes.toHuman(this.state.resizeMode)} <span className="caret"></span>
                      </button>
                      <ul className="dropdown-menu">
                        {ResizeModes.all().map(mode =>
                          <li key={mode}>
                            <a href="javascript:void(0);"
                              onClick={this.setResizeMode(mode)}>
                              <i style={{ opacity: this.state.resizeMode === mode ? 1 : 0 }} className="fa fa-check"></i> {ResizeModes.toHuman(mode)}</a>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
                {this.state.items.map((Item, i) => <div key={i} className="form-group">
                  <Item taskInfo={this.state.taskInfo}
                    getFiles={this.props.getFiles}
                    filesCount={this.props.filesCount}
                  />
                </div>)}
              </div>

              : ""}
          </div>

          {this.state.editTaskFormLoaded ?
            <div className="form-group">
              {/* SETTINGS STEP BUTTON CANCEL | NEXT */}
              {this.state.currentStep === "settingsStep" &&
                <div className="col-sm-offset-2 col-sm-10 text-right">
                  {this.props.onCancel !== undefined && <button type="submit" className="btn btn-danger" onClick={this.cancel} style={{ marginRight: 4 }}>{_("Cancel")}</button>}
                  {this.state.loading ?
                    <button type="submit" className="btn btn-primary" disabled={true}><i className="fa fa-circle-notch fa-spin fa-fw"></i>{_("Loading…")}</button>
                    :
                    <button type="submit" className="btn btn-confirm" onClick={this.save} disabled={this.props.filesCount < 1 || !filesCountOk}>{_("Próximo")}</button>
                  }
                </div>
              }

              {/* AI STEP BUTTON CANCEL | NEXT */}
              {this.state.currentStep === "aiStep" &&
                <div className="col-sm-offset-2 col-sm-10 text-right">
                  {this.props.onCancel !== undefined && <button type="submit" className="btn btn-danger" onClick={this.cancel} style={{ marginRight: 4 }}>{_("Cancel")}</button>}
                  {this.state.loading ?
                    <button type="submit" className="btn btn-primary" disabled={true}><i className="fa fa-circle-notch fa-spin fa-fw"></i>{_("Loading…")}</button>
                    :
                    <button type="submit" className="btn btn-confirm" style={{ backgroundColor: "#529A4C" }} onClick={this.save} disabled={this.props.filesCount < 1 || !filesCountOk}>{_("Start Processing")}</button>
                  }
                </div>
              }
            </div>
            : ""}
        </div>
      </div >
    );
  }
}

export default NewTaskPanel;
