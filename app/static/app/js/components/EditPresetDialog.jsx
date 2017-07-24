import '../css/EditPresetDialog.scss';
import React from 'react';
import ErrorMessage from './ErrorMessage';
import FormDialog from './FormDialog';
import ProcessingNodeOption from './ProcessingNodeOption';
import $ from 'jquery';

class EditPresetDialog extends React.Component {
    static defaultProps = {
        show: false
    };

    static propTypes = {
        preset: React.PropTypes.object.isRequired,
        availableOptions: React.PropTypes.array.isRequired,
        show: React.PropTypes.bool
    };

    constructor(props){
        super(props);

        // Refs to ProcessingNodeOption components
        this.options = {};

        this.state = {
          name: props.preset.name
        };

        this.reset = this.reset.bind(this);
        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
        this.setOptionRef = this.setOptionRef.bind(this);
        this.getOptions = this.getOptions.bind(this);
        this.getAvailableOptions = this.getAvailableOptions.bind(this);
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

    // @return available options, but populate a "defaultValue" key 
    // before returning the object.
    getAvailableOptions(){
        const { preset, availableOptions } = this.props;

        availableOptions.forEach(opt => {
            if (!opt.defaultValue){
                let presetOpt;
                if (preset && Array.isArray(preset.options)){
                  presetOpt = preset.options.find(to => to.name == opt.name);
                }

                if (presetOpt){
                  opt.defaultValue = opt.value;
                  opt.value = presetOpt.value;
                }else{
                  opt.defaultValue = opt.value !== undefined ? opt.value : "";
                  delete(opt.value);
                }
            }
        });

        return availableOptions;
    }

    reset(){
      this.setState({
        name: this.props.preset.name
      });
    }

    getFormData(){
      return this.state;
    }

    onShow(){
      this.nameInput.focus();
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

    handleSave(){

    }

    render(){
        let options = this.getAvailableOptions();
        
        return (
            <div className="edit-preset-dialog">
                <FormDialog {...this.props}
                    getFormData={this.getFormData} 
                    reset={this.reset}
                    onShow={this.onShow}
                    saveIcon="fa fa-edit"
                    title="Edit Options"
                    saveAction={this.handleSave}
                    ref={(domNode) => { this.dialog = domNode; }}>
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