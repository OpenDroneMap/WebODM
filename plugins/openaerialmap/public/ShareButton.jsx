import './ShareButton.scss';
import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';

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
            loading: true,
            shared: false,
            error: ''
        };

        console.log("AH!");
    }

    componentDidMount(){
        const { task } = this.props; 

        $.ajax({
            type: 'GET',
            url: `/api/plugins/openaerialmap/task/${task.id}/shareinfo`,
            contentType: "application/json"
        }).done(result => {
            this.setState({shared: result.shared, loading: false})
        }).fail(error => {
            this.setState({error, loading: false});
        });
    }

    handleClick = () => {
        console.log("HEY!", this.props.token);
    }

    render(){
        const { loading, shared } = this.state;

        return (<button
                onClick={this.handleClick}
                disabled={loading || shared}
                className="btn btn-sm btn-primary">
                    {loading ? 
                    <i className="fa fa-circle-o-notch fa-spin fa-fw"></i> :
                    [<i className="oam-icon fa"></i>, (shared ? "Shared To OAM" : " Share To OAM")]}
                </button>);
    }
}