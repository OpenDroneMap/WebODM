import '../css/EditPresetDialog.scss';
import React from 'react';
import ErrorMessage from './ErrorMessage';
import FormDialog from './FormDialog';
import ProcessingNodeOption from './ProcessingNodeOption';
import PresetUtils from '../classes/PresetUtils';
import $ from 'jquery';

class EditPresetDialog extends React.Component {
    static defaultProps = {
    };

    static propTypes = {
        preset: React.PropTypes.object.isRequired,
        availableOptions: React.PropTypes.array.isRequired,
        onHide: React.PropTypes.func
    };

    constructor(props){
        super(props);

        // Refs to ProcessingNodeOption components
        this.options = {};

        this.state = {
            name: props.preset.name
        };

        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
        this.setOptionRef = this.setOptionRef.bind(this);
        this.getOptions = this.getOptions.bind(this);
        this.handleSave = this.handleSave.bind(this);
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

    getFormData(){
      return this.state; // TODO: necessary?
    }

    onShow(){
      this.nameInput.focus();
    }

    handleChange(field){
      return (e) => {
        let state = {};
        state[field] = e.target.value;
        this.setState(state);
      }
    }

    handleSave(){

    }

    render(){
        let options = PresetUtils.getAvailableOptions(this.props.preset.options, this.props.availableOptions);

        return (
            <div className="edit-preset-dialog">
                <FormDialog {...this.props}
                    getFormData={this.getFormData} 
                    reset={() => {}}
                    show={true}
                    onShow={this.onShow}
                    saveIcon="fa fa-edit"
                    title="Edit Options"
                    saveAction={this.handleSave}>
                  <div className="row preset-name">
                    <label className="col-sm-2 control-label">Name</label>
                    <div className="col-sm-10">
                      <input type="text" className="form-control" ref={(domNode) => { this.nameInput = domNode; }} value={this.state.name} onChange={this.handleChange('name')} />
                    </div>
                  </div>
                  <div className="row">
                    <label className="col-sm-2 control-label">Options</label>
                    <div className="col-sm-10">
                    {options.map(option =>
                        <ProcessingNodeOption {...option}
                          key={option.name}
                          ref={this.setOptionRef(option.name)} /> 
                    )}
                    </div>
                  </div>
                </FormDialog>
            </div>
        );
    }
}

export default EditPresetDialog;