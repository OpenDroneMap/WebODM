import React from 'React';
import './app.scss';

export default class HelloWorld extends React.Component {
  constructor(props){
    super(props);
  }

  render(){
    return (<span className="plugin-hello">{this.props.greeting}, I'm a React component!</span>);
  }
}