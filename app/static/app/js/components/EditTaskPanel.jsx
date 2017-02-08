import '../css/EditTaskPanel.scss';
import React from 'react';
import ProcessingNodeOption from './ProcessingNodeOption';
import values from 'object.values';
import Utils from '../classes/Utils';

if (!Object.values) {
    values.shim();
}

class EditTaskPanel extends React.Component {
  constructor(){
    super();

    this.namePlaceholder = "Task of " + (new Date()).toISOString();

    this.state = {
      name: "",
      error: "",
      advancedOptions: false,
      loadedProcessingNodes: false,
      selectedNode: null,
      processingNodes: [],
      editing: true
    };

    // Refs to ProcessingNodeOption components
    this.options = {};

    this.handleNameChange = this.handleNameChange.bind(this);
    this.setAdvancedOptions = this.setAdvancedOptions.bind(this);
    this.handleSelectNode = this.handleSelectNode.bind(this);
    this.setOptionRef = this.setOptionRef.bind(this);
    this.save = this.save.bind(this);
    this.edit = this.edit.bind(this);
    this.loadProcessingNodes = this.loadProcessingNodes.bind(this);
    this.retryLoadProcessingNodes = this.retryLoadProcessingNodes.bind(this);
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
          }
          if (json.length === 0){
            noProcessingNodesError();
            return;
          }

          let now = new Date();

          let nodes = json.map(node => {
            let last_refreshed = new Date(node.last_refreshed);
            let enabled = (now - last_refreshed) < 1000 * 60 * 5; // 5 minutes

            return {
              id: node.id,
              key: node.id,
              label: `${node.hostname}:${node.port} (queue: ${node.queue_count})`,
              options: node.available_options,
              queue_count: node.queue_count,
              enabled: enabled,
              url: `http://${node.hostname}:${node.port}`
            };
          });

          // Find a node with lowest queue count
          let minQueueCount = Math.min(...nodes.filter(node => node.enabled).map(node => node.queue_count));
          let minQueueCountNodes = nodes.filter(node => node.enabled && node.queue_count === minQueueCount);

          if (minQueueCountNodes.length === 0){
            noProcessingNodesError(nodes);
            return;
          }

          // Choose at random
          let autoNode = minQueueCountNodes[~~(Math.random() * minQueueCountNodes.length)];

          nodes.unshift({
            id: autoNode.id,
            key: "auto",
            label: "Auto",
            options: autoNode.options,
            enabled: true
          });

          this.setState({
              selectedNode: nodes[0],
              processingNodes: nodes,
              loadedProcessingNodes: true
          });
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

  retryLoadProcessingNodes(){
    this.setState({
      error: ""
    });
    this.loadProcessingNodes();
  }

  componentDidMount(){
    this.loadProcessingNodes();
  }

  componentWillUnmount(){
      this.nodesRequest.abort();
  }

  handleNameChange(e){
    this.setState({name: e.target.value});
  }

  handleSelectNode(e){
    this.options = {};
    this.setState({selectedNode: this.state.processingNodes.find(node => node.key == e.target.value)});
  }

  setAdvancedOptions(flag){
    return () => {
      this.setState({advancedOptions: flag});
    };
  }

  setOptionRef(optionName){
    return (component) => {
      if (component) this.options[optionName] = component;
    }
  }

  getOptions(){
    return Object.values(this.options)
      .map(option => {
        return {
          name: option.props.name,
          value: option.getValue()
        };
      })
      .filter(option => option.value !== undefined);
  }

  save(e){
    e.preventDefault();
    this.setState({editing: false});
    if (this.props.onSave) this.props.onSave(this.getTaskInfo());
  }

  getTaskInfo(){
    return {
      name: this.state.name !== "" ? this.state.name : this.namePlaceholder,
      selectedNode: this.state.selectedNode,
      options: this.getOptions()
    };
  }

  edit(e){
    e.preventDefault();
    this.setState({editing: true});
  }

  render() {
    if (this.state.error){
      return (<div className="edit-task-panel">
          <div className="alert alert-warning">
              <div dangerouslySetInnerHTML={{__html:this.state.error}}></div>
              <button className="btn btn-sm btn-primary" onClick={this.retryLoadProcessingNodes}>
                <i className="fa fa-rotate-left"></i> Retry
              </button>
          </div>
        </div>);
    }

    if (this.state.editing){
      let processingNodesOptions = "";
      if (this.state.loadedProcessingNodes){
        processingNodesOptions = (
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
            <div className="form-group">
              <label className="col-sm-2 control-label">Options</label>
              <div className="col-sm-10">
                <div className="btn-group" role="group">
                  <button type="button" className={"btn " + (!this.state.advancedOptions ? "btn-default" : "btn-secondary")} onClick={this.setAdvancedOptions(false)}>Default</button>
                  <button type="button" className={"btn " + (this.state.advancedOptions ? "btn-default" : "btn-secondary")} onClick={this.setAdvancedOptions(true)}>Advanced</button>
                </div>
              </div>
            </div>
            <div className={"form-group " + (!this.state.advancedOptions ? "hide" : "")}>
              <div className="col-sm-offset-2 col-sm-10">
                {this.state.selectedNode.options.map(option =>
                  <ProcessingNodeOption {...option} 
                    key={option.name} 
                    ref={this.setOptionRef(option.name)} /> 
                )}
              </div>
            </div>
          </div>
          );
      }else{
        processingNodesOptions = (<div className="form-group">
            <div className="col-sm-offset-2 col-sm-10">Loading processing nodes... <i className="fa fa-refresh fa-spin fa-fw"></i></div>
          </div>);
      }

      return (
        <div className="edit-task-panel">
          <form className="form-horizontal">
            <p>{this.props.uploading ? 
              "Your images are being uploaded. In the meanwhile, check these additional options:"
            : "Please check these additional options:"}</p>
            <div className="form-group">
              <label className="col-sm-2 control-label">Name</label>
              <div className="col-sm-10">
                <input type="text" onChange={this.handleNameChange} className="form-control" placeholder={this.namePlaceholder} />
              </div>
            </div>
            {processingNodesOptions}
            {this.state.loadedProcessingNodes ? 
              <div className="form-group">
                <div className="col-sm-offset-2 col-sm-10 text-right">
                  <button type="submit" className="btn btn-primary" onClick={this.save}><i className="glyphicon glyphicon-saved"></i> {this.props.uploading ? "Save" : "Start Processing"}</button>
                </div>
              </div>
              : ""}
          </form>
        </div>
      );
    }else if (this.props.uploading){
      // Done editing, but still uploading
      return (
          <div className="edit-task-panel">
            <div className="pull-right">
              <button type="submit" className="btn btn-primary btn-sm glyphicon glyphicon-pencil" onClick={this.edit}></button>
            </div>
            <p className="header"><strong>Thank you!</strong> Please wait for the upload to complete.</p>
          </div>
        );
    }else{
      return (<div><i className="fa fa-refresh fa-spin fa-fw"></i></div>);
    }
  }
}

export default EditTaskPanel;
