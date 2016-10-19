import '../css/EditTaskPanel.scss';
import React from 'react';
import ProcessingNodeOption from './ProcessingNodeOption';

class EditTaskPanel extends React.Component {
  constructor(){
    super();

    this.namePlaceholder = "Task of " + (new Date()).toISOString();

    this.state = {
      name: "",
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
  }

  componentDidMount(){
    // Load projects from API
    const loadProcessingNodes = () => {
      function failed(){
        // Try again
        setTimeout(loadProcessingNodes, 1000);
      }

      this.nodesRequest = $.getJSON("/api/processingnodes/", json => {
          if (Array.isArray(json)){

            let nodes = json.map(node => {
              return {
                id: node.id,
                key: node.id,
                label: `${node.hostname}:${node.port} (queue: ${node.queue_count})`,
                options: node.available_options
              };
            });

            // Find a node with lowest queue count
            let minQueueCount = Math.min(...json.map(node => node.queue_count));
            let minQueueCountnodes = json.filter(node => node.queue_count === minQueueCount);

            // Choose at random
            let autoNode = minQueueCountnodes[~~(Math.random() * minQueueCountnodes.length)];

            nodes.unshift({
              id: autoNode.id,
              key: "auto",
              label: "Auto",
              options: autoNode.available_options
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
    loadProcessingNodes();
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
    // console.log(this.getOptions());
    // console.log(this.state.selectedNode);
    // console.log(this.state.name || this.namePlaceholder);
    this.setState({editing: false});
  }

  edit(e){
    e.preventDefault();
    this.setState({editing: true});
  }

  render() {
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
                    <option value={node.key} key={node.key}>{node.label}</option>
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
            <p>Your images are being uploaded. In the meanwhile, check these additional options:</p>
            <div className="form-group">
              <label className="col-sm-2 control-label">Name</label>
              <div className="col-sm-10">
                <input type="text" onChange={this.handleNameChange} className="form-control" placeholder={this.namePlaceholder} />
              </div>
            </div>
            {processingNodesOptions}
            <div className="form-group">
              <div className="col-sm-offset-2 col-sm-10 text-right">
                <button type="submit" className="btn btn-primary" onClick={this.save}><i className="glyphicon glyphicon-saved"></i> Save</button>
              </div>
            </div>
          </form>
        </div>
      );
    }else{
      return (
          <div className="edit-task-panel">
            <div className="pull-right">
              <button type="submit" className="btn btn-primary btn-sm glyphicon glyphicon-pencil" onClick={this.edit}></button>
            </div>
            <p className="header"><strong>Thank you!</strong> Please wait for the upload to complete.</p>
          </div>
        );
    }
  }
}

export default EditTaskPanel;
