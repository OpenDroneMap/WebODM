import React from 'react';
import ErrorMessage from './ErrorMessage';
import FormDialog from './FormDialog';
import $ from 'jquery';

class EditProjectDialog extends React.Component {
    static defaultProps = Object.assign({
        projectName: "",
        projectDescr: ""
    }, FormDialog.defaultProps);

    static propTypes = Object.assign({
        projectName: React.PropTypes.string,
        projectDescr: React.PropTypes.string
    }, FormDialog.propTypes);

    constructor(props){
        super(props);
    }

    show(){
      this.dialog.show();
    }

    render(){
        return (
            <FormDialog {...this.props} ref={reactUtils.setRefAndExtend(this, FormDialog, 'dialog')}>
              <div className="form-group">
                <label className="col-sm-2 control-label">Name</label>
                <div className="col-sm-10">
                  <input type="text" className="form-control" ref={(domNode) => { this.nameInput = domNode; }} />
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-2 control-label">Description (optional)</label>
                <div className="col-sm-10">
                  <textarea className="form-control" rows="3" ref={(domNode) => { this.descrInput = domNode; }} />
                </div>
              </div>
            </FormDialog>
        );
    }
}

export default EditProjectDialog;