import './ShareButton.scss';
import React from 'react';
import PropTypes from 'prop-types';

module.exports = class ShareButton extends React.Component{
    static defaultProps = {
        task: null,
        token: ""
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
        token: PropTypes.string.isRequired // OAM Token
    };

    constructor(props){
        super(props);

        this.state = {
            loading: true
        };
    }

    handleClick = () => {
        console.log("HEY!", this.props.token);
    }

    render(){
        return (<button
                onClick={this.handleClick}
                className="btn btn-sm btn-primary">
                    {this.state.loading
                    ? <i className="fa fa-circle-o-notch fa-spin fa-fw"></i>
                    : [<i className="oam-icon fa"></i>, "Share To OAM"]}
                </button>);
    }
}