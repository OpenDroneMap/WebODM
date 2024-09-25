import React from 'react';
import PropTypes from 'prop-types';
import '../css/MarkFieldsPanel.scss';
import { _ } from '../classes/gettext';

export default class LayersControlPanel extends React.Component {

    static propTypes = {
        onClose: PropTypes.func.isRequired,
        map: PropTypes.object.isRequired
    }

    constructor(props){
        super(props);
    }

    render(){
    
        return (
            <div className="markFields-control-panel">
                <span className="close-button" onClick={this.props.onClose}/>
                <div className="title">{_("Mark Fields")}</div>
                <hr/>
                algum conteudo ?
                <hr/>
                <button>Marcar Talhões</button>
            </div>
        );
    }
}
