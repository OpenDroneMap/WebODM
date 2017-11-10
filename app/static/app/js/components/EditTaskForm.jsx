import '../css/EditTaskForm.scss';
import React from 'react';
import Utils from '../classes/Utils';
import EditPresetDialog from './EditPresetDialog';
import ErrorMessage from './ErrorMessage';
import PropTypes from 'prop-types';
import Storage from '../classes/Storage';
import $ from 'jquery';


class EditTaskForm extends React.Component {
  static defaultProps = {
    selectedNode: null,
    task: null
  };

  static propTypes = {
      selectedNode: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number
      ]),
      onFormLoaded: PropTypes.func,
      task: PropTypes.object
  };

  constructor(props){
    super(props);

    this.namePlaceholder = "Task of " + (new Date()).toISOString();

    this.state = {
      error: "",
      presetError: "",
      presetActionPerforming: false,

      name: props.task !== null ? (props.task.name || "") : "",
      loadedProcessingNodes: false,
      loadedPresets: false,

      selectedNode: null,
      processingNodes: [],
      selectedPreset: null,
      presets: [],

      editingPreset: false
    };

    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleSelectNode = this.handleSelectNode.bind(this);
    this.loadProcessingNodes = this.loadProcessingNodes.bind(this);
    this.retryLoad = this.retryLoad.bind(this);
    this.selectNodeByKey = this.selectNodeByKey.bind(this);
    this.getTaskInfo = this.getTaskInfo.bind(this);
    this.notifyFormLoaded = this.notifyFormLoaded.bind(this);
    this.loadPresets = this.loadPresets.bind(this);
    this.handleSelectPreset = this.handleSelectPreset.bind(this);
    this.selectPresetById = this.selectPresetById.bind(this);
    this.handleEditPreset = this.handleEditPreset.bind(this);
    this.handleCancelEditPreset = this.handleCancelEditPreset.bind(this);
    this.handlePresetSave = this.handlePresetSave.bind(this);
    this.handleDuplicateSavePreset = this.handleDuplicateSavePreset.bind(this);
    this.handleDeletePreset = this.handleDeletePreset.bind(this);
    this.findFirstPresetMatching = this.findFirstPresetMatching.bind(this);
    this.getAvailableOptionsOnly = this.getAvailableOptionsOnly.bind(this);
    this.getAvailableOptionsOnlyText = this.getAvailableOptionsOnlyText.bind(this);
    this.saveLastPresetToStorage = this.saveLastPresetToStorage.bind(this);
  }

  notifyFormLoaded(){
    if (this.props.onFormLoaded && 
        this.state.loadedPresets && 
        this.state.loadedProcessingNodes) this.props.onFormLoaded();
  }

  loadProcessingNodes(){
    function failed(){
      // Try again
      setTimeout(loadProcessingNodes, 1000);
    }

    this.nodesRequest = 
      $.getJSON("/api/processingnodes/?has_available_options=True", json => {
        if (Array.isArray(json)){
          // No nodes with options?
          const noProcessingNodesError = (nodes) => {
            var extra = nodes ? "We tried to reach:<ul>" + nodes.map(n => Utils.html`<li><a href="${n.url}">${n.label}</a></li>`).join("") + "</ul>" : "";
            this.setState({error: `There are no usable processing nodes. ${extra}Make sure that at least one processing node is reachable and
             that you have granted the current user sufficient permissions to view 
             the processing node (by going to Administration -- Processing Nodes -- Select Node -- Object Permissions -- Add User/Group and check CAN VIEW PROCESSING NODE).
             If you are bringing a node back online, it will take about 30 seconds for WebODM to recognize it.`});
          };

          if (json.length === 0){
            noProcessingNodesError();
            return;
          }

          let now = new Date();

          let nodes = json.map(node => {
            return {
              id: node.id,
              key: node.id,
              label: `${node.hostname}:${node.port} (queue: ${node.queue_count})`,
              options: node.available_options,
              queue_count: node.queue_count,
              enabled: node.online,
              url: `http://${node.hostname}:${node.port}`
            };
          });

          let autoNode = null;

          // If the user has selected auto, and a processing node has been assigned
          // we need attempt to find the "auto" node to be the one that has been assigned
          if (this.props.task && this.props.task.processing_node && this.props.task.auto_processing_node){
            autoNode = nodes.find(node => node.id === this.props.task.processing_node);
          }

          if (!autoNode){
            // Find a node with lowest queue count
            let minQueueCount = Math.min(...nodes.filter(node => node.enabled).map(node => node.queue_count));
            let minQueueCountNodes = nodes.filter(node => node.enabled && node.queue_count === minQueueCount);

            if (minQueueCountNodes.length === 0){
              noProcessingNodesError(nodes);
              return;
            }

            // Choose at random
            autoNode = minQueueCountNodes[~~(Math.random() * minQueueCountNodes.length)];
          }

          nodes.unshift({
            id: autoNode.id,
            key: "auto",
            label: "Auto",
            options: autoNode.options,
            enabled: true
          });

          this.setState({
            processingNodes: nodes,
            loadedProcessingNodes: true
          });

          // Have we specified a node?
          if (this.props.task && this.props.task.processing_node){
            if (this.props.task.auto_processing_node){
              this.selectNodeByKey("auto");
            }else{
              this.selectNodeByKey(this.props.task.processing_node);
            }
          }else{
            this.selectNodeByKey("auto");
          }

          this.notifyFormLoaded();
        }else{
          console.error("Got invalid json response for processing nodes", json);
          failed();
        }
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        // I don't expect this to fail, unless it's a development error or connection error.
        // in which case we don't need to notify the user directly. 
        console.error("Error retrieving processing nodes", jqXHR, textStatus);
        failed();
      });
  }

  retryLoad(){
    this.setState({error: ""});
    this.loadProcessingNodes();
    this.loadPresets();
  }

  findFirstPresetMatching(presets, options){
    for (let i = 0; i < presets.length; i++){
      const preset = presets[i];

      if (options.length === preset.options.length){
        let dict = {};
        options.forEach(opt => {
          dict[opt.name] = opt.value;
        });
        
        let matchingOptions = 0;
        for (let j = 0; j < preset.options.length; j++){
          if (dict[preset.options[j].name] !== preset.options[j].value){
            break;
          }else{
            matchingOptions++;
          }
        }

        // If we terminated the loop above, all options match
        if (matchingOptions === options.length) return preset;
      }
    }

    return null;
  }

  loadPresets(){
    function failed(){
      // Try again
      setTimeout(loadPresets, 1000);
    }

    this.presetsRequest = 
      $.getJSON("/api/presets/?ordering=-system,-created_at", presets => {
        if (Array.isArray(presets)){
          // Add custom preset
          const customPreset = {
            id: -1,
            name: "(Custom)",
            options: [],
            system: true
          };
          presets.unshift(customPreset);

          // Choose preset
          let selectedPreset = presets[0],
              defaultPreset = presets.find(p => p.name === "Default"); // Do not translate Default
          if (defaultPreset) selectedPreset = defaultPreset;
          
          // If task's options are set attempt
          // to find a preset that matches the current task options
          if (this.props.task && Array.isArray(this.props.task.options) && this.props.task.options.length > 0){
            const taskPreset = this.findFirstPresetMatching(presets, this.props.task.options);
            if (taskPreset !== null){
              selectedPreset = taskPreset;
            }else{
              customPreset.options = Utils.clone(this.props.task.options);
              selectedPreset = customPreset;
            }
          }else{
            // Check local storage for last used preset
            const lastPresetId = Storage.getItem("last_preset_id");
            if (lastPresetId !== null){
              const lastPreset = presets.find(p => p.id == lastPresetId);
              if (lastPreset) selectedPreset = lastPreset;
            }
          }

          this.setState({
            loadedPresets: true, 
            presets: presets, 
            selectedPreset: selectedPreset
          });
          this.notifyFormLoaded();
        }else{
          console.error("Got invalid json response for presets", json);
          failed();
        }
      })
      .fail((jqXHR, textStatus, errorThrown) => {
        // I don't expect this to fail, unless it's a development error or connection error.
        // in which case we don't need to notify the user directly. 
        console.error("Error retrieving processing nodes", jqXHR, textStatus);
        failed();
      });
  }

  handleSelectPreset(e){
    this.selectPresetById(e.target.value);
  }

  selectPresetById(id){
    let preset = this.state.presets.find(p => p.id === parseInt(id));
    if (preset) this.setState({selectedPreset: preset});
  }

  componentDidMount(){
    this.loadProcessingNodes();
    this.loadPresets();
  }

  componentWillUnmount(){
      if (this.nodesRequest) this.nodesRequest.abort();
      if (this.presetsRequest) this.presetsRequest.abort();
  }

  handleNameChange(e){
    this.setState({name: e.target.value});
  }

  selectNodeByKey(key){
    let node = this.state.processingNodes.find(node => node.key == key);
    if (node) this.setState({selectedNode: node});
  }

  handleSelectNode(e){
    this.selectNodeByKey(e.target.value);
  }

  // Filter a list of options based on the ones that
  // are available (usually options are from a preset and availableOptions
  // from a processing node)
  getAvailableOptionsOnly(options, availableOptions){
    const optionNames = {};

    availableOptions.forEach(opt => optionNames[opt.name] = true);
    return options.filter(opt => optionNames[opt.name]);
  }

  getAvailableOptionsOnlyText(options, availableOptions){
    const opts = this.getAvailableOptionsOnly(options, availableOptions);
    return opts.map(opt => `${opt.name}:${opt.value}`).join(", ");
  }

  saveLastPresetToStorage(){
    if (this.state.selectedPreset){
      Storage.setItem('last_preset_id', this.state.selectedPreset.id);
    }
  }

  getTaskInfo(){
    const { name, selectedNode, selectedPreset } = this.state;

    return {
      name: name !== "" ? name : this.namePlaceholder,
      selectedNode: selectedNode,
      options: this.getAvailableOptionsOnly(selectedPreset.options, selectedNode.options)
    };
  }

  handleEditPreset(){
    // If the user tries to edit a system preset
    // set the "Custom..." options to it
    const { selectedPreset, presets } = this.state;

    if (selectedPreset.system){
      let customPreset = presets.find(p => p.id === -1);
      // Might have been deleted
      if (!customPreset){
        customPreset = {
          id: -1,
          name: "(Custom)",
          options: [],
          system: true
        };
        presets.unshift(customPreset);
        this.setState({presets});
      }
      customPreset.options = Utils.clone(selectedPreset.options);
      this.setState({selectedPreset: customPreset});
    }

    this.setState({editingPreset: true});
  }

  handleCancelEditPreset(){
    this.setState({editingPreset: false});
  }

  handlePresetSave(preset){
    const done = () => {
      // Update presets and selected preset
      let p = this.state.presets.find(p => p.id === preset.id);
      p.name = preset.name;
      p.options = preset.options;

      this.setState({selectedPreset: p});
    };

    // If it's a custom preset do not update server-side
    if (preset.id === -1){
      done();
      return $.Deferred().resolve();
    }else{
      return $.ajax({
        url: `/api/presets/${preset.id}/`,
        contentType: 'application/json',
        data: JSON.stringify({
          name: preset.name,
          options: preset.options
        }),
        dataType: 'json',
        type: 'PATCH'
      }).done(done);
    }
  }

  handleDuplicateSavePreset(){
    // Create a new preset with the same settings as the
    // currently selected preset
    const { selectedPreset, presets } = this.state;
    this.setState({presetActionPerforming: true});

    const isCustom = selectedPreset.id === -1,
          name = isCustom ? "My Preset" : "Copy of " + selectedPreset.name;

    $.ajax({
      url: `/api/presets/`,
      contentType: 'application/json',
      data: JSON.stringify({
        name: name,
        options: selectedPreset.options
      }),
      dataType: 'json',
      type: 'POST'
    }).done(preset => {
      // If the original preset was a custom one, 
      // we remove it from the list (since we just saved it)
      if (isCustom){
        presets.splice(presets.indexOf(selectedPreset), 1);
      }

      // Add new preset to list, select it, then edit
      presets.push(preset);
      this.setState({presets, selectedPreset: preset});
      this.handleEditPreset();
    }).fail(() => {
      this.setState({presetError: "Could not duplicate the preset. Please try to refresh the page."});
    }).always(() => {
      this.setState({presetActionPerforming: false});
    });
  }

  handleDeletePreset(){
    const { selectedPreset, presets } = this.state;
    if (selectedPreset.system){
      this.setState({presetError: "System presets can only be removed by a staff member from the Administration panel."});
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${selectedPreset.name}"?`)){
      this.setState({presetActionPerforming: true});

      return $.ajax({
        url: `/api/presets/${selectedPreset.id}/`,
        contentType: 'application/json',
        type: 'DELETE'
      }).done(() => {
        presets.splice(presets.indexOf(selectedPreset), 1);

        // Select first by default
        this.setState({presets, selectedPreset: presets[0], editingPreset: false});
      }).fail(() => {
        this.setState({presetError: "Could not delete the preset. Please try to refresh the page."});
      }).always(() => {
        this.setState({presetActionPerforming: false});
      });
    }else{
      return $.Deferred().resolve();
    }
  }

  render() {
    if (this.state.error){
      return (<div className="edit-task-panel">
          <div className="alert alert-warning">
              <div dangerouslySetInnerHTML={{__html:this.state.error}}></div>
              <button className="btn btn-sm btn-primary" onClick={this.retryLoad}>
                <i className="fa fa-rotate-left"></i> Retry
              </button>
          </div>
        </div>);
    }

    let taskOptions = "";
    if (this.state.loadedProcessingNodes && 
      this.state.selectedNode && 
      this.state.loadedPresets &&
      this.state.selectedPreset){

      taskOptions = (
        <div>
          <div className="form-group">
            <label className="col-sm-2 control-label">Processing Node</label>
              <div className="col-sm-10">
                <select className="form-control" value={this.state.selectedNode.key} onChange={this.handleSelectNode}>
                {this.state.processingNodes.map(node => 
                  <option value={node.key} key={node.key} disabled={!node.enabled}>{node.label}</option>
                )}
                </select>
              </div>
          </div>
          <div className="form-group form-inline">
            <label className="col-sm-2 control-label">Options</label>
            <div className="col-sm-10">
              <select 
                  title={this.getAvailableOptionsOnlyText(this.state.selectedPreset.options, this.state.selectedNode.options)}
                  className="form-control" 
                  value={this.state.selectedPreset.id} 
                  onChange={this.handleSelectPreset}>
                {this.state.presets.map(preset => 
                  <option value={preset.id} key={preset.id} className={preset.system ? "system-preset" : ""}>{preset.name}</option>
                )}
              </select>

              {!this.state.presetActionPerforming ?
                <div className="btn-group presets-dropdown">
                  <button type="button" className="btn btn-default" onClick={this.handleEditPreset}>
                    <i className="fa fa-sliders"></i>
                  </button>
                  <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown">
                        <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <a href="javascript:void(0);" onClick={this.handleEditPreset}><i className="fa fa-sliders"></i> Edit</a>
                    </li>
                    <li className="divider"></li>

                    {this.state.selectedPreset.id !== -1 ?
                      <li>
                        <a href="javascript:void(0);" onClick={this.handleDuplicateSavePreset}><i className="fa fa-copy"></i> Duplicate</a>
                      </li>
                    :
                      <li>
                        <a href="javascript:void(0);" onClick={this.handleDuplicateSavePreset}><i className="fa fa-save"></i> Save</a>
                      </li>
                    }
                    <li className={this.state.selectedPreset.system ? "disabled" : ""}>
                      <a href="javascript:void(0);" onClick={this.handleDeletePreset}><i className="fa fa-trash-o"></i> Delete</a>
                    </li>
                  </ul>
                </div>
              : <i className="preset-performing-action-icon fa fa-cog fa-spin fa-fw"></i>}
              <ErrorMessage className="preset-error" bind={[this, 'presetError']} />
            </div>
          </div>

          {this.state.editingPreset ? 
            <EditPresetDialog
              preset={this.state.selectedPreset}
              availableOptions={this.state.selectedNode.options}
              onHide={this.handleCancelEditPreset}
              saveAction={this.handlePresetSave}
              deleteAction={this.handleDeletePreset}
              ref={(domNode) => { if (domNode) this.editPresetDialog = domNode; }}
            />
          : ""}

        </div>
        );
    }else{
      taskOptions = (<div className="form-group">
          <div className="col-sm-offset-2 col-sm-10">Loading processing nodes and presets... <i className="fa fa-refresh fa-spin fa-fw"></i></div>
        </div>);
    }

    return (
      <div className="edit-task-form">
        <div className="form-group">
          <label className="col-sm-2 control-label">Name</label>
          <div className="col-sm-10">
            <input type="text" 
              onChange={this.handleNameChange} 
              className="form-control"
              placeholder={this.namePlaceholder} 
              value={this.state.name} 
            />
          </div>
        </div>
        {taskOptions}
      </div>
    );
  }
}

export default EditTaskForm;
