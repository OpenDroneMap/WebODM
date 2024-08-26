import React from 'react';
import PropTypes from 'prop-types';
import '../css/OverviewControlPanel.scss';
import { _ } from '../classes/gettext';

export default class OverviewControlPanel extends React.Component {

    static propTypes = {

    }

    constructor(props){
        super(props);
    }

    render(){

        return (
            <div className="overview-control-panel">
                <span className="close-button" onClick={this.props.onClose}/>
                <div className="title">Overview</div>
                <hr/>
                {this.props.selectedLayers && this.props.selectedLayers.length > 0
                    ? "Array selectedLayers não está vazio"
                    : "Array selectedLayers Vazio"}
            </div>);
    }
}
