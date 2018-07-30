import React from 'react';
import '../css/TaskPluginActionButtons.scss';
import PropTypes from 'prop-types';
import PluginsAPI from '../classes/plugins/API';
import update from 'immutability-helper';

class TaskPluginActionButtons extends React.Component {
    static defaultProps = {
        task: null,
        disabled: false
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
        disabled: PropTypes.bool
    };

    constructor(props){
        super(props);

        this.state = {
            buttons: []
        };
    }

    componentDidMount(){
        PluginsAPI.Dashboard.triggerAddTaskActionButton({
            task: this.props.task
        }, (button) => {
            if (!button) return;

            this.setState(update(this.state, {
                buttons: {$push: [button]}
            }));
        });
    }

    render(){
        if (this.state.buttons.length > 0){
            return (
              <div className={"row plugin-action-buttons " + (this.props.disabled ? "disabled" : "")}>
                  {this.state.buttons.map((button, i) => <div key={i}>{button}</div>)}
              </div>);
        }else{
            return "";
        }
    }
}

export default TaskPluginActionButtons;