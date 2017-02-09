import '../css/EditTaskForm.scss';
import React from 'react';
import ProcessingNodeOption from './ProcessingNodeOption';
import values from 'object.values';
import Utils from '../classes/Utils';

if (!Object.values) {
    values.shim();
}

class EditTaskForm extends React.Component {
  static defaultProps = {
    name: "",
    advancedOptions: false,
    selectedNode: null
  };

  static propTypes = {
      advancedOptions: React.PropTypes.bool,
      selectedNode: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.number
      ]),
      onFormLoaded: React.PropTypes.func
  };

  constructor(props){
    super(props);

    this.namePlaceholder = "Task of " + (new Date()).toISOString();

    this.state = {
      error: "",
      name: props.name,
      advancedOptions: props.advancedOptions,
      loadedProcessingNodes: false,
      selectedNode: null,
      processingNodes: []
    };

    // Refs to ProcessingNodeOption components
    this.options = {};

    this.handleNameChange = this.handleNameChange.bind(this);
    this.setAdvancedOptions = this.setAdvancedOptions.bind(this);
    this.handleSelectNode = this.handleSelectNode.bind(this);
    this.setOptionRef = this.setOptionRef.bind(this);
    this.loadProcessingNodes = this.loadProcessingNodes.bind(this);
    this.retryLoadProcessingNodes = this.retryLoadProcessingNodes.bind(this);
    this.selectNodeByKey = this.selectNodeByKey.bind(this);
    this.getTaskInfo = this.getTaskInfo.bind(this);
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
            processingNodes: nodes,
            loadedProcessingNodes: true
          });

          // Have we specified a node?
          if (this.props.selectedNode){
            this.selectNodeByKey(props.selectedNode);
          }else{
            this.selectNodeByKey(nodes[0].key);
          }

          if (this.props.onFormLoaded) this.props.onFormLoaded();
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
    this.setState({error: ""});
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

  selectNodeByKey(key){
    let node = this.state.processingNodes.find(node => node.key == key);
    if (node) this.setState({selectedNode: node});
  }

  handleSelectNode(e){
    this.options = {};
    this.selectNodeByKey(e.target.value);
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

  getTaskInfo(){
    return {
      name: this.state.name !== "" ? this.state.name : this.namePlaceholder,
      selectedNode: this.state.selectedNode,
      options: this.getOptions()
    };
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

    let processingNodesOptions = "";
    if (this.state.loadedProcessingNodes && this.state.selectedNode){
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
      <div className="edit-task-form">
        <div className="form-group">
          <label className="col-sm-2 control-label">Name</label>
          <div className="col-sm-10">
            <input type="text" onChange={this.handleNameChange} className="form-control" placeholder={this.namePlaceholder} />
          </div>
        </div>
        {processingNodesOptions}
      </div>
    );
  }
}

export default EditTaskForm;
