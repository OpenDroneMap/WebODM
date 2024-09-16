import React from 'react';
import '../css/TaskListItem.scss';
import Console from '../Console';
import statusCodes from '../classes/StatusCodes';
import pendingActions from '../classes/PendingActions';
import ErrorMessage from './ErrorMessage';
import EditTaskPanel from './EditTaskPanel';
import AssetDownloadButtons from './AssetDownloadButtons';
import HistoryNav from '../classes/HistoryNav';
import PropTypes from 'prop-types';
import TaskPluginActionButtons from './TaskPluginActionButtons';
import MoveTaskDialog from './MoveTaskDialog';
import PipelineSteps from '../classes/PipelineSteps';
import Css from '../classes/Css';
import Tags from '../classes/Tags';
import Trans from './Trans';
import Utils from '../classes/Utils';
import { _, interpolate } from '../classes/gettext';

class TaskListItem extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    data: PropTypes.object.isRequired, // task json
    refreshInterval: PropTypes.number, // how often to refresh info
    onDelete: PropTypes.func,
    onMove: PropTypes.func,
    onDuplicate: PropTypes.func,
    hasPermission: PropTypes.func,
    onEdited: PropTypes.func,
    onTagClicked: PropTypes.func
  }

  constructor(props) {
    super();

    this.historyNav = new HistoryNav(props.history);

    this.state = {
      expanded: this.historyNav.isValueInQSList("project_task_expanded", props.data.id),
      task: {},
      time: props.data.processing_time,
      actionError: "",
      actionButtonsDisabled: false,
      editing: false,
      memoryError: false,
      friendlyTaskError: "",
      pluginActionButtons: [],
      view: "basic",
      showMoveDialog: false,
      actionLoading: false,
    }

    for (let k in props.data) {
      this.state.task[k] = props.data[k];
    }

    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.consoleOutputUrl = this.consoleOutputUrl.bind(this);
    this.stopEditing = this.stopEditing.bind(this);
    this.startEditing = this.startEditing.bind(this);
    this.checkForCommonErrors = this.checkForCommonErrors.bind(this);
    this.handleEditTaskSave = this.handleEditTaskSave.bind(this);
    this.setView = this.setView.bind(this);

    // Retrieve CSS values for status bar colors
    this.backgroundSuccessColor = Css.getValue('theme-background-success', 'backgroundColor');
    this.backgroundFailedColor = Css.getValue('theme-background-failed', 'backgroundColor');
  }

  shouldRefresh() {
    if (this.state.task.pending_action !== null) return true;

    // If a task is completed, or failed, etc. we don't expect it to change
    if ([statusCodes.COMPLETED, statusCodes.FAILED, statusCodes.CANCELED].indexOf(this.state.task.status) !== -1) return false;

    return (([statusCodes.QUEUED, statusCodes.RUNNING, null].indexOf(this.state.task.status) !== -1 && this.state.task.processing_node) ||
      (!this.state.task.uuid && this.state.task.processing_node && !this.state.task.last_error));
  }

  loadTimer(startTime) {
    if (!this.processingTimeInterval) {
      this.setState({ time: startTime });

      this.processingTimeInterval = setInterval(() => {
        this.setState({ time: this.state.time += 1000 });
      }, 1000);
    }
  }

  setView(type) {
    return () => {
      this.setState({ view: type });
    }
  }

  unloadTimer() {
    if (this.processingTimeInterval) {
      clearInterval(this.processingTimeInterval);
      this.processingTimeInterval = null;
    }
    if (this.state.task.processing_time) this.setState({ time: this.state.task.processing_time });
  }

  componentDidMount() {
    if (this.shouldRefresh()) this.refreshTimeout = setTimeout(() => this.refresh(), this.props.refreshInterval || 3000);

    // Load timer if we are in running state
    if (this.state.task.status === statusCodes.RUNNING) this.loadTimer(this.state.task.processing_time);
  }

  refresh() {
    // Fetch
    this.refreshRequest = $.getJSON(`/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/`, json => {
      if (json.id) {
        let oldStatus = this.state.task.status;

        this.setState({ task: json, actionButtonsDisabled: false });

        // Update timer if we switched to running
        if (oldStatus !== this.state.task.status) {
          if (this.state.task.status === statusCodes.RUNNING) {
            if (this.console) this.console.clear();
            if (this.basicView) this.basicView.reset();
            this.loadTimer(this.state.task.processing_time);
          } else {
            this.setState({ time: this.state.task.processing_time });
            this.unloadTimer();
          }

          if (this.state.task.status !== statusCodes.FAILED) {
            this.setState({ memoryError: false, friendlyTaskError: "" });
          }
        }
      } else {
        console.warn("Cannot refresh task: " + json);
      }

      this.setAutoRefresh();
    })
      .fail((_, __, errorThrown) => {
        if (errorThrown === "Not Found") { // Don't translate this one
          // Assume this has been deleted
          if (this.props.onDelete) this.props.onDelete(this.state.task.id);
        } else {
          this.setAutoRefresh();
        }
      });
  }

  setAutoRefresh() {
    if (this.shouldRefresh()) this.refreshTimeout = setTimeout(() => this.refresh(), this.props.refreshInterval || 3000);
  }

  componentWillUnmount() {
    this.unloadTimer();
    if (this.refreshRequest) this.refreshRequest.abort();
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
  }

  toggleExpanded() {
    const expanded = !this.state.expanded;

    this.historyNav.toggleQSListItem("project_task_expanded", this.props.data.id, expanded);

    this.setState({
      expanded: expanded
    });
  }

  consoleOutputUrl(line) {
    return `/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/output/?line=${line}`;
  }

  hoursMinutesSecs(t) {
    if (t === 0 || t === -1) return "-- : -- : --";

    let ch = 60 * 60 * 1000,
      cm = 60 * 1000,
      h = Math.floor(t / ch),
      m = Math.floor((t - h * ch) / cm),
      s = Math.round((t - h * ch - m * cm) / 1000),
      pad = function (n) { return n < 10 ? '0' + n : n; };
    if (s === 60) {
      m++;
      s = 0;
    }
    if (m === 60) {
      h++;
      m = 0;
    }
    return [pad(h), pad(m), pad(s)].join(':');
  }

  genActionApiCall(action, options = {}) {
    return () => {
      const doAction = () => {
        this.setState({ actionButtonsDisabled: true });

        let url = `/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/${action}/`;
        $.post(url,
          {
            uuid: this.state.task.uuid
          }
        ).done(json => {
          if (json.success) {
            this.refresh();
            if (options.success !== undefined) options.success(json);
          } else {
            this.setState({
              actionError: json.error || options.defaultError || _("Cannot complete operation."),
              actionButtonsDisabled: false,
              expanded: true
            });
          }
        })
          .fail(() => {
            this.setState({
              actionError: options.defaultError || _("Cannot complete operation."),
              actionButtonsDisabled: false
            });
          })
          .always(() => {
            if (options.always !== undefined) options.always();
          });
      }

      if (options.confirm) {
        if (window.confirm(options.confirm)) {
          doAction();
        }
      } else {
        doAction();
      }
    };
  }

  optionsToList(options) {
    if (!Array.isArray(options)) return "";
    else if (options.length === 0) return "Default";
    else {
      return options.map(opt => `${opt.name}: ${opt.value}`).join(", ");
    }
  }

  startEditing() {
    this.setState({ expanded: true, editing: true });
  }

  stopEditing() {
    this.setState({ editing: false });
  }

  checkForCommonErrors(lines) {
    for (let line of lines) {
      if (line.indexOf("Killed") !== -1 ||
        line.indexOf("MemoryError") !== -1 ||
        line.indexOf("std::bad_alloc") !== -1 ||
        line.indexOf("Child returned 137") !== -1 ||
        line.indexOf("loky.process_executor.TerminatedWorkerError:") !== -1 ||
        line.indexOf("Failed to allocate memory") !== -1) {
        this.setState({ memoryError: true });
      } else if (line.indexOf("SVD did not converge") !== -1 ||
        line.indexOf("0 partial reconstructions in total") !== -1) {
        this.setState({
          friendlyTaskError: interpolate(_("It looks like there might be one of the following problems: %(problems)s You can read more about best practices for capturing good images %(link)s."), {
            problems: `<ul>
          <li>${_("Not enough images")}</li>
          <li>${_("Not enough overlap between images")}</li>
          <li>${_("Images might be too blurry (common with phone cameras)")}</li>
          <li>${_("The min-num-features task option is set too low, try increasing it by 25%")}</li>
        </ul>`, link: `<a href='https://docs.webodm.net/references/create-successful-maps' target='_blank'>${_("here")}</a>`
          })
        });
      } else if (line.indexOf("Illegal instruction") !== -1 ||
        line.indexOf("Child returned 132") !== -1) {
        this.setState({ friendlyTaskError: interpolate(_("It looks like this computer might be too old. WebODM requires a computer with a 64-bit CPU supporting MMX, SSE, SSE2, SSE3 and SSSE3 instruction set support or higher. You can still run WebODM if you compile your own docker images. See %(link)s for more information."), { link: `<a href='https://github.com/OpenDroneMap/WebODM#common-troubleshooting'>${_("this page")}</a>` }) });
      } else if (line.indexOf("Child returned 127") !== -1) {
        this.setState({ friendlyTaskError: _("The processing node is missing a program necessary to complete the task. This might indicate a corrupted installation. If you built OpenDroneMap, please check that all programs built without errors.") });
      }
    }
  }

  isMacOS() {
    return window.navigator.platform === "MacIntel";
  }

  handleEditTaskSave(task) {
    this.setState({ task, editing: false });
    if (this.props.onEdited) this.props.onEdited(task);
    this.setAutoRefresh();
  }

  handleMoveTask = () => {
    this.setState({ showMoveDialog: true });
  }

  handleDuplicateTask = () => {
    this.setState({ actionLoading: true });
    this.genActionApiCall("duplicate", {
      success: (json) => {
        if (json.task) {
          if (this.props.onDuplicate) this.props.onDuplicate(json.task);
        }
      },
      always: () => {
        this.setState({ actionLoading: false });
      }
    })();
  }

  getRestartSubmenuItems() {
    const { task } = this.state;

    // Map rerun-from parameters to display items
    const rfMap = {};
    PipelineSteps.get().forEach(rf => rfMap[rf.action] = rf);

    // Create onClick handlers
    for (let rfParam in rfMap) {
      rfMap[rfParam].label = interpolate(_("From %(stage)s"), { stage: rfMap[rfParam].label });
      rfMap[rfParam].onClick = this.genRestartAction(rfParam);
    }

    let items = task.can_rerun_from
      .map(rf => rfMap[rf])
      .filter(rf => rf !== undefined);

    if (items.length > 0 && [statusCodes.CANCELED, statusCodes.FAILED].indexOf(task.status) !== -1) {
      // Add resume "pseudo button" to help users understand
      // how to resume a task that failed for memory/disk issues.
      items.unshift({
        label: _("Resume Processing"),
        icon: "fa fa-bolt",
        onClick: this.genRestartAction(task.can_rerun_from[task.can_rerun_from.length - 1])
      });
    }

    return items;
  }

  genRestartAction(rerunFrom = null) {
    const { task } = this.state;

    const restartAction = this.genActionApiCall("restart", {
      success: () => {
        this.setState({ time: -1 });
      },
      defaultError: _("Cannot restart task.")
    }
    );

    const setTaskRerunFrom = (value) => {
      this.setState({ actionButtonsDisabled: true });

      // Removing rerun-from?
      if (value === null) {
        task.options = task.options.filter(opt => opt['name'] !== 'rerun-from');
      } else {
        // Adding rerun-from
        let opt = null;
        if (opt = task.options.find(opt => opt['name'] === 'rerun-from')) {
          opt['value'] = value;
        } else {
          // Not in existing list of options, append
          task.options.push({
            name: 'rerun-from',
            value: value
          });
        }
      }

      let data = {
        options: task.options
      };

      // Force reprocess
      if (value === null) data.uuid = '';

      return $.ajax({
        url: `/api/projects/${task.project}/tasks/${task.id}/`,
        contentType: 'application/json',
        data: JSON.stringify(data),
        dataType: 'json',
        type: 'PATCH'
      }).done((taskJson) => {
        this.setState({ task: taskJson });
      })
        .fail(() => {
          this.setState({
            actionError: interpolate(_("Cannot restart task from (stage)s."), { stage: value || "the start" }),
            actionButtonsDisabled: false
          });
        });
    };

    return () => {
      setTaskRerunFrom(rerunFrom)
        .then(restartAction);
    };
  }

  moveTaskAction = (formData) => {
    if (formData.project !== this.state.task.project) {
      return $.ajax({
        url: `/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/`,
        contentType: 'application/json',
        data: JSON.stringify(formData),
        dataType: 'json',
        type: 'PATCH'
      }).done(this.props.onMove);
    } else return false;
  }

  handleTagClick = t => {
    return () => {
      if (this.props.onTagClicked) this.props.onTagClicked(t);
    }
  }



  render() {
    const task = this.state.task;
    const name = task.name !== null ? task.name : interpolate(_("Task #%(number)s"), { number: task.id });
    const imported = task.import_url !== "";

    let status = statusCodes.description(task.status);
    if (status === "") status = _("Sending images to processing node");

    if (!task.processing_node && !imported) status = _("Waiting for a node...");
    if (task.pending_action !== null) status = pendingActions.description(task.pending_action);

    const disabled = this.state.actionButtonsDisabled ||
      ([pendingActions.CANCEL,
      pendingActions.REMOVE,
      pendingActions.RESTART].indexOf(task.pending_action) !== -1);
    const editable = this.props.hasPermission("change") && [statusCodes.FAILED, statusCodes.COMPLETED, statusCodes.CANCELED].indexOf(task.status) !== -1;
    const actionLoading = this.state.actionLoading;

    let expanded = "";
    if (this.state.expanded) {
      let showOrthophotoMissingWarning = false,
        showMemoryErrorWarning = this.state.memoryError && task.status == statusCodes.FAILED,
        showTaskWarning = this.state.friendlyTaskError !== "" && task.status == statusCodes.FAILED,
        showExitedWithCodeOneHints = task.last_error === "Process exited with code 1" &&
          !showMemoryErrorWarning &&
          !showTaskWarning &&
          task.status == statusCodes.FAILED,
        memoryErrorLink = this.isMacOS() ? "http://stackoverflow.com/a/39720010" : "https://docs.docker.com/docker-for-windows/#advanced";

      let actionButtons = [];
      const addActionButton = (label, className, icon, onClick, options = {}) => {
        actionButtons.push({
          className, icon, label, onClick, options
        });
      };

      if (task.status === statusCodes.COMPLETED) {
        if (task.available_assets.indexOf("orthophoto.tif") !== -1 || task.available_assets.indexOf("dsm.tif") !== -1) {
          addActionButton(" " + _("Vier Mapa"), "btn-primary", "fa fa-globe", () => {
            location.href = `/map/project/${task.project}/task/${task.id}/`;
          });
        } else {
          showOrthophotoMissingWarning = task.available_assets.indexOf("orthophoto.tif") === -1;
        }

        addActionButton(" " + _("View 3D Model"), "btn-primary", "fa fa-cube", () => {
          location.href = `/3d/project/${task.project}/task/${task.id}/`;
        });
      }

      if (editable || (!task.processing_node)) {
        addActionButton(_("Editar"), "btn-primary pull-right edit-button", "glyphicon glyphicon-pencil", () => {
          this.startEditing();
        }, {
          className: "inline"
        });
      }

      if ([statusCodes.QUEUED, statusCodes.RUNNING, null].indexOf(task.status) !== -1 &&
        (task.processing_node || imported) && this.props.hasPermission("change")) {
        addActionButton(_("Cancelar"), "btn-primary", "fa fa-times", this.genActionApiCall("cancel", { defaultError: _("Cannot cancel task.") }));
      }

      if ([statusCodes.FAILED, statusCodes.COMPLETED, statusCodes.CANCELED].indexOf(task.status) !== -1 &&
        task.processing_node &&
        this.props.hasPermission("change") &&
        !imported) {
        // By default restart reruns every pipeline
        // step from the beginning
        const rerunFrom = task.can_rerun_from.length > 1 ?
          task.can_rerun_from[1] :
          null;

        addActionButton(_("Restart"), "btn-primary", "glyphicon glyphicon-repeat", this.genRestartAction(rerunFrom), {
          subItems: this.getRestartSubmenuItems()
        });
      }

      if (this.props.hasPermission("delete")) {
        addActionButton(_("Excluir"), "btn-danger", "fa fa-trash fa-fw", this.genActionApiCall("remove", {
          confirm: _("All information related to this task, including images, maps and models will be deleted. Continue?"),
          defaultError: _("Cannot delete task.")
        }));
      }
      
      actionButtons = (<div className="action-buttons">
        {task.status === statusCodes.COMPLETED ?
          <AssetDownloadButtons task={this.state.task} disabled={disabled} />
          : ""}
        {actionButtons.map(button => {


          const subItems = button.options.subItems || [];
          const className = button.options.className || "";

          let buttonHtml = (<button type="button" className={"btn btn-sm " + button.className + " " + button.label} onClick={button.onClick} disabled={disabled}>
            <i className={button.icon}></i>
            {button.label}
          </button>);
          if (subItems.length > 0) {
            // The button expands sub items
            buttonHtml = (<button type="button" className={"btn btn-sm  btn-drop-label " + button.className} data-toggle="dropdown" disabled={disabled}>
              <i className={button.icon}></i>
              {button.label}
            </button>);
          }

          return (
            <div key={button.label} className={"inline-block " +
              (subItems.length > 0 ? "btn-group withdrop-container" : "") + " " +
              className}>
              {buttonHtml}
              {subItems.length > 0 &&
                [<button key="dropdown-button"
                  disabled={disabled}
                  type="button"
                  className={"btn btn-sm dropdown-toggle " + button.className}
                  data-toggle="dropdown"><span className="caret"></span></button>,
                <ul key="dropdown-menu" className="dropdown-menu">
                  {subItems.map(subItem => <li key={subItem.label}>
                    <a href="javascript:void(0);" onClick={subItem.onClick}><i className={subItem.icon + ' fa-fw '}></i>{subItem.label}</a>
                  </li>)}
                </ul>]}
            </div>);
        })}
      </div>);

      const stats = task.statistics;

      expanded = (
        <div className="expanded-panel">
          <div className="row">
            <div className="col-md-12 no-padding">
              <table className="table table-condensed info-table">
                <tbody>
                  <tr>
                    <td><strong>{_("Criado em:")}</strong></td>
                    <td>{(new Date(task.created_at)).toLocaleString()}</td>
                  </tr>
                  {/* <tr>
                    <td><strong>{_("Processing Node:")}</strong></td>
                    <td>{task.processing_node_name || "-"} ({task.auto_processing_node ? _("auto") : _("manual")})</td>
                  </tr> */}
                  {/* {Array.isArray(task.options) &&
                    <tr>
                      <td><strong>{_("Options:")}</strong></td>
                      <td>{this.optionsToList(task.options)}</td>
                    </tr>} */}
                  {/* {stats && stats.gsd &&
                    <tr>
                      <td><strong>{_("Average GSD:")}</strong></td>
                      <td>{parseFloat(stats.gsd.toFixed(2)).toLocaleString()} cm</td>
                    </tr>} */}
                    {task.size > 0 &&
                    <tr>
                      <td><strong>{_("Uso do Disco:")}</strong></td>
                      <td>{Utils.bytesToSize(task.size * 1024 * 1024)}</td>
                    </tr>}
                  {stats && stats.area &&
                    <tr>
                      <td><strong>{_("Area:")}</strong></td>
                      <td>{parseFloat(stats.area.toFixed(2)).toLocaleString()} m&sup2;</td>
                    </tr>}
                  {/* {stats && stats.pointcloud && stats.pointcloud.points &&
                    <tr>
                      <td><strong>{_("Reconstructed Points:")}</strong></td>
                      <td>{stats.pointcloud.points.toLocaleString()}</td>
                    </tr>} */}
                  <tr>
                    <td><strong>{_("Resultado da Tarefa:")}</strong></td>
                    <td>
                      {/* <div className="btn-group btn-toggle switch-toggle">
                        <button onClick={this.setView("console")} 
                                className={"btn btn-xs " + (this.state.view === "basic" ? "btn-default" : "btn-primary")}>
                                  {_("On")}
                        </button>
                        <button onClick={this.setView("basic")} 
                                className={"btn btn-xs " + (this.state.view === "console" ? "btn-default" : "btn-primary")}>
                                  {_("Off")}
                              </button>
                      </div> */}

                      <div className="toggle-switch">
                        <input 
                          type="checkbox" 
                          id={`toggle-switch-${this.props.data.id}`}
                          checked={this.state.view === "console"} 
                          onChange={() => this.setState({ view: this.state.view === "console" ? "basic" : "console" })}
                        />
                        <label htmlFor={`toggle-switch-${this.props.data.id}`} className="switch"></label>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {this.state.view === 'console' ?
            
                <Console
                  className="floatfix"
                  source={this.consoleOutputUrl}
                  refreshInterval={this.shouldRefresh() ? 3000 : undefined}
                  autoscroll={true}
                  height={200}
                  ref={domNode => this.console = domNode}
                  onAddLines={this.checkForCommonErrors}
                  showConsoleButtons={true}
                  maximumLines={500}
                /> : ""}

              {showOrthophotoMissingWarning ?
                <div className="task-warning"><i className="fa fa-warning"></i> <span>{_("An orthophoto could not be generated. To generate one, make sure GPS information is embedded in the EXIF tags of your images, or use a Ground Control Points (GCP) file.")}</span></div> : ""}

              {showMemoryErrorWarning ?
                <div className="task-warning"><i className="fa fa-support"></i> <Trans params={{ memlink: `<a href="${memoryErrorLink}" target='_blank'>${_("enough RAM allocated")}</a>`, cloudlink: `<a href='https://webodm.net' target='_blank'>${_("cloud processing node")}</a>` }}>{_("It looks like your processing node ran out of memory. If you are using docker, make sure that your docker environment has %(memlink)s. Alternatively, make sure you have enough physical RAM, reduce the number of images, make your images smaller, or reduce the max-concurrency parameter from the task's options. You can also try to use a %(cloudlink)s.")}</Trans></div> : ""}

              {showTaskWarning ?
                <div className="task-warning"><i className="fa fa-support"></i> <span dangerouslySetInnerHTML={{ __html: this.state.friendlyTaskError }} /></div> : ""}

              {showExitedWithCodeOneHints ?
                <div className="task-warning"><i className="fa fa-info-circle"></i> <div className="inline">
                  <Trans params={{ link: `<a href="${window.__taskOptionsDocsLink}" target="_blank">${window.__taskOptionsDocsLink.replace("https://", "")}</a>` }}>{_("\"Process exited with code 1\" means that part of the processing failed. Sometimes it's a problem with the dataset, sometimes it can be solved by tweaking the Task Options. Check the documentation at %(link)s")}</Trans>
                </div>
                </div>
                : ""}
            </div>
          </div>
          <div className="row clearfix">
            <ErrorMessage bind={[this, 'actionError']} />
            {actionButtons}
          </div>
          <TaskPluginActionButtons task={task} disabled={disabled} />
        </div>
      );

      // If we're editing, the expanded view becomes the edit panel
      if (this.state.editing) {
        expanded = <div className="task-list-item">
          <div className="row no-padding">
            <EditTaskPanel
              task={this.state.task}
              onSave={this.handleEditTaskSave}
              onCancel={this.stopEditing}
            />
          </div>
        </div>;
      }
    }

    let statusIcon = statusCodes.icon(task.status);

    // LOADING STATUS

    // @param type {String} one of: ['neutral', 'done', 'error']


    // const getStatusLabel = (text, type = 'neutral', progress = 100) => {
    //   let color = 'rgba(255, 255, 255, 0.0)';
    //   if (type === 'done') color = this.backgroundSuccessColor;
    //   else if (type === 'error') color = this.backgroundFailedColor;
    //   return (<div
    //     className={"status-label theme-border-primary " + type}
    //     style={{ background: `linear-gradient(90deg, ${color} ${progress}%, rgba(255, 255, 255, 0) ${progress}%)` }}
    //     title={text}><i className={statusIcon}></i> {text}</div>);
    // }

    const getStatusLabel = (text, type = 'neutral', progress = 100) => {
      const percentage = progress.toFixed(1);
      const active = type === 'done' ? 'active' : '';

          // Define a largura mínima para a barra
      const minWidth = 20; // 20% como exemplo

      // Calcula a largura da barra com base no progresso e na largura mínima
      const barWidth = Math.max(progress, minWidth);
      
      return (
        <div className="upload-progress-bar">
          <div className="progress" style={{
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
            height: "40px",
            borderRadius: "80px", 
            backgroundColor: "#E3E3E3",
            padding: "5px",
            
          }}>
            <div className={`progress-bar progress-bar-striped ${active}`} style={{
              width: `${barWidth}%`,
              backgroundImage: type === 'done'
                ? "linear-gradient(to bottom, #17A398, #269F64, #2C9D4F)"
                : "linear-gradient(to bottom, #FF4E4E, #D93636, #B32A2A)",
              borderRadius: "80px", 
              display: "flex",
              gap: "8px",
              justifyContent: "center",
              alignItems: "center",
              whiteSpace: "nowrap", // Impede quebra de linha
              overflow: "hidden", // Esconde o excesso de texto, se necessário
              textOverflow: "ellipsis",
            }}>
              <i className={statusIcon}></i> {progress < 100 ? `${percentage}%` : `${text}`}
              
            </div>
          </div>
        </div>
      );
    };

    let statusLabel = "";
    let showEditLink = false;

    if (task.last_error) {
      statusLabel = getStatusLabel(task.last_error, 'error');
    } else if (!task.processing_node && !imported && this.props.hasPermission("change")) {
      statusLabel = getStatusLabel(_("Set a processing node"));
      statusIcon = "fa fa-hourglass-3";
      showEditLink = true;
    } else if (task.partial && !task.pending_action) {
      statusIcon = "fa fa-hourglass-3";
      statusLabel = getStatusLabel(_("Waiting for image upload..."));
    } else {
      let progress = 100;
      let type = 'done';

      if (task.pending_action === pendingActions.RESIZE) {
        progress = task.resize_progress * 100;
      } else if (task.status === null) {
        progress = task.upload_progress * 100;
      } else if (task.status === statusCodes.RUNNING) {
        progress = task.running_progress * 100;
      } else if (task.status === statusCodes.FAILED) {
        type = 'error';
      } else if (task.status !== statusCodes.COMPLETED) {
        type = 'neutral';
      }

      statusLabel = getStatusLabel(status, type, progress);
    }

    const taskActions = [];
    const addTaskAction = (label, icon, onClick) => {
      taskActions.push(
        <li key={label}><a href="javascript:void(0)" onClick={onClick}><i className={icon}></i>{label}</a></li>
      );
    };

    if ([statusCodes.QUEUED, statusCodes.RUNNING, null].indexOf(task.status) !== -1 &&
      (task.processing_node || imported) && this.props.hasPermission("change")) {
      addTaskAction(_("Cancelar"), "glyphicon glyphicon-remove-circle", this.genActionApiCall("cancel", { defaultError: _("Cannot cancel task.") }));
    }

    // Ability to change options
    if (editable || (!task.processing_node && this.props.hasPermission("change"))) {
      taskActions.push(<li key="edit"><a href="javascript:void(0)" onClick={this.startEditing}><i className="glyphicon glyphicon-pencil"></i>{_("Editar")}</a></li>);
    }

    if (editable) {
      taskActions.push(
        <li key="move"><a href="javascript:void(0)" onClick={this.handleMoveTask}><i className="fa fa-arrows-alt"></i>{_("Mover")}</a></li>,
        <li key="duplicate"><a href="javascript:void(0)" onClick={this.handleDuplicateTask}><i className="fa fa-copy"></i>{_("Duplicar")}</a></li>
      );
    }


    if (this.props.hasPermission("delete")) {
      taskActions.push(
        <li key="sep" role="separator" className="divider"></li>,
      );

      addTaskAction(_("Deletar"), "fa fa-trash", this.genActionApiCall("remove", {
        confirm: _("All information related to this task, including images, maps and models will be deleted. Continue?"),
        defaultError: _("Cannot delete task.")
      }));
    }

    let taskActionsIcon = "fa-ellipsis-h";
    if (actionLoading) taskActionsIcon = "fa-circle-notch fa-spin fa-fw";
    const userTags = Tags.userTags(task.tags);

    return (
      <div className="task-list-item">
        {this.state.showMoveDialog ?
          <MoveTaskDialog
            task={task}
            ref={(domNode) => { this.moveTaskDialog = domNode; }}
            onHide={() => this.setState({ showMoveDialog: false })}
            saveAction={this.moveTaskAction}
          />
          : ""}
        <div className="row">
          <div className="col-sm-5 col-xs-12 name">
            <div onClick={this.toggleExpanded} className="clickable icon">
              {this.state.expanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" stroke="currentColor" strokeWidth="1" className="bi bi-minus-circle" viewBox="0 0 20 20">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                  <path d="M5 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" stroke="currentColor" strokeWidth="1" className="bi bi-plus-circle" viewBox="0 0 20 20">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                </svg>
              )}
            </div> 
            <a href="javascript:void(0);" onClick={this.toggleExpanded} className="name-link">{name}</a>
            {userTags.length > 0 ?
              userTags.map((t, i) => <div key={i} className="tag-badge small-badge" onClick={this.handleTagClick(t)}>{t}</div>)
              : ""}
          </div>
          <div className="col-sm-1 col-xs-5 details">
            <i className="far fa-image"></i> {task.images_count}
          </div>
          <div className="col-sm-2 col-xs-5 details">
            <i className="far fa-clock"></i> {this.hoursMinutesSecs(this.state.time)}
          </div>
          <div className="col-xs-2 text-right visible-xs-block">
            {taskActions.length > 0 ?
              <div className="btn-group">
                <button disabled={disabled || actionLoading} className="btn task-actions btn-secondary btn-xs dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <i className={"fa " + taskActionsIcon}></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-right">
                  {taskActions}
                </ul>
              </div>
              : ""}
          </div>
          <div className="col-sm-3 col-xs-12">
            {showEditLink ?
              <a href="javascript:void(0);" onClick={this.startEditing}>{statusLabel}</a>
              : statusLabel}
          </div>
          <div className="col-sm-1 text-right hidden-xs options">
            {taskActions.length > 0 ?
              <div className="btn-group">
                <button disabled={disabled || actionLoading} className="btn task-actions btn-secondary btn-xs dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <i className={"options-icon fa " + taskActionsIcon}></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-right">
                  {taskActions}
                </ul>
              </div>
              : ""}
          </div>
        </div>
        {expanded}
      </div>
    );
  }
}

export default TaskListItem;
