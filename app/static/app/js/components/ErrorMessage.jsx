import React from 'react';

class ErrorMessage extends React.Component {
    constructor(props){
        super();

        this.state = {
            error: props.message
        };

        this.close = this.close.bind(this);
    }

    close(){
        this.setState({error: ""});
    }

    render(){
        if (this.state.error){
            return (
                <div className="alert alert-warning alert-dismissible">
                    <button type="button" className="close" aria-label="Close" onClick={this.close}><span aria-hidden="true">&times;</span></button>
                    {this.state.error}
                </div>
            );
        }else{
            return (<div></div>);
        }
    }
}

export default ErrorMessage;