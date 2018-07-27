import React from 'react';
import ErrorMessage from 'webodm/components/ErrorMessage';
import FormDialog from 'webodm/components/FormDialog';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ShareDialog extends React.Component {
    static defaultProps = {
        task: null,
        taskInfo: null,
        title: "Share To OpenAerialMap",
        saveLabel: "Share",
        savingLabel: "Sharing...",
        saveIcon: "fa fa-share",
        show: false
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
        taskInfo: PropTypes.object.isRequired,
        saveAction: PropTypes.func.isRequired,
        title: PropTypes.string,
        saveLabel: PropTypes.string,
        savingLabel: PropTypes.string,
        saveIcon: PropTypes.string,
        show: PropTypes.bool
    };

    constructor(props){
        super(props);

        this.state = this.getInitialState(props);

        this.reset = this.reset.bind(this);
        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    getInitialState = (props) => {
        return {
          sensor: props.taskInfo.sensor,
          startDate: this.toDatetimeLocal(new Date(props.taskInfo.startDate)),
          endDate: this.toDatetimeLocal(new Date(props.taskInfo.endDate)),
          title: props.taskInfo.title,
          provider: props.taskInfo.provider,
          tags: ""
        };
    }

    // Credits to https://gist.github.com/WebReflection/6076a40777b65c397b2b9b97247520f0
    toDatetimeLocal = (date) => {
        const ten = function (i) {
            return (i < 10 ? '0' : '') + i;
        };

        const YYYY = date.getFullYear(),
        MM = ten(date.getMonth() + 1),
        DD = ten(date.getDate()),
        HH = ten(date.getHours()),
        II = ten(date.getMinutes()),
        SS = ten(date.getSeconds())

        return YYYY + '-' + MM + '-' + DD + 'T' +
                 HH + ':' + II + ':' + SS;
    };

    reset(){
      this.setState(this.getInitialState(this.props));
    }

    getFormData(){
      return this.state;
    }

    onShow(){
      this.titleInput.focus();
    }

    show(){
      this.dialog.show();
    }

    hide(){
      this.dialog.hide();
    }

    handleChange(field){
      return (e) => {
        let state = {};
        state[field] = e.target.value;
        this.setState(state);
      }
    }

    render(){
        // TODO: tags are currently not being parsed properly
        // by the OAM endpoint, so we'll leave them out.

        return (
            <FormDialog {...this.props} 
                getFormData={this.getFormData} 
                reset={this.reset}
                ref={(domNode) => { this.dialog = domNode; }}>
              <div className="form-group">
                <label className="col-sm-3 control-label">Title</label>
                <div className="col-sm-9">
                  <input type="text" className="form-control" ref={(domNode) => { this.titleInput = domNode; }} value={this.state.title} onChange={this.handleChange('title')} />
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-3 control-label">Sensor</label>
                <div className="col-sm-9">
                  <input type="text" className="form-control" ref={(domNode) => { this.sensorInput = domNode; }} value={this.state.sensor} onChange={this.handleChange('sensor')} />
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-3 control-label">Provider</label>
                <div className="col-sm-9">
                  <input type="text" className="form-control" ref={(domNode) => { this.providerInput = domNode; }} value={this.state.provider} onChange={this.handleChange('provider')} />
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-3 control-label">Flight Start Date</label>
                <div className="col-sm-9">
                  <input type="datetime-local" className="form-control" ref={(domNode) => { this.startDateInput = domNode; }} value={this.state.startDate} onChange={this.handleChange('startDate')} />
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-3 control-label">Flight End Date</label>
                <div className="col-sm-9">
                  <input type="datetime-local" className="form-control" ref={(domNode) => { this.endDateInput = domNode; }} value={this.state.endDate} onChange={this.handleChange('endDate')} />
                </div>
              </div>
{/*              <div className="form-group">
                <label className="col-sm-3 control-label">Tags (comma separated)</label>
                <div className="col-sm-9">
                  <input type="text" className="form-control" ref={(domNode) => { this.tagsInput = domNode; }} value={this.state.tags} onChange={this.handleChange('tags')} />
                </div>
              </div>*/}
            </FormDialog>
        );
    }
}

export default ShareDialog;