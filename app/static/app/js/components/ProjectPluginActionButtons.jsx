import React from "react";
import PropTypes from 'prop-types';
import PluginsAPI from '../classes/plugins/API';
import update from 'immutability-helper';

class ProjectPluginActionButtons extends React.Component {
    static defaultProps = {
        project: null,
    };
    static propTypes = {
        project: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            buttons: []
        };
    }

    componentDidMount() {
        PluginsAPI.Dashboard.triggerAddProjectActionButton({
            project: this.props.project
        }, (button) => {
            if (!button) return;

            this.setState(update(this.state, {
                buttons: {$push: [button]}
            }));
        });
    }


    render() {
        if (this.state.buttons.length > 0) {
            return (
                <div className={"row plugin-action-buttons " + (this.props.disabled ? "disabled" : "")}>
                    {this.state.buttons.map((button, i) => <div key={i}>{button}</div>)}
                </div>);
        } else {
            return "";
        }
    }
}

export default ProjectPluginActionButtons;