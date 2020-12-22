import React from 'react';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

class ErrorMessage extends React.Component {
    static propTypes = {
        bind: PropTypes.array.isRequired // two element array, 
                                               // with first element being the parent element 
                                               // and the second the error property to display
                                               // ex. [this, 'error']
    };

    constructor(props){
        super(props);
        this.close = this.close.bind(this);
    }

    close(){
        const [parent, prop] = this.props.bind;
        parent.setState({[prop]: ""});
    }

    render(){
        const [parent, prop] = this.props.bind;

        if (parent.state[prop]){
            return (
                <div className={"alert alert-warning alert-dismissible " + (this.props.className ? this.props.className : "")}>
                    <button type="button" className="close" title={_("Close")} onClick={this.close}><span aria-hidden="true">&times;</span></button>
                    {parent.state[prop]}
                </div>
            );
        }else{
            return (<div></div>);
        }
    }
}

export default ErrorMessage;