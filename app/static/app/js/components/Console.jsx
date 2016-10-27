import React from 'react';
import '../css/Console.scss';
import '../vendor/google-code-prettify/prettify';
import '../vendor/google-code-prettify/prettify.css';
import update from 'react-addons-update';
import $ from 'jquery';

class Console extends React.Component {
  constructor(props){
    super();

    this.state = {
      lines: []
    };

    if (typeof props.children === "string"){
      console.log(props.children);
      this.state.lines = props.children.split('\n');
    }

    this.autoscroll = true;

    this.setRef = this.setRef.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
  }

  componentDidMount(){
    if (this.props.lang) prettyPrint();
    this.checkAutoscroll();
  }

  setRef(domNode){
    if (domNode != null){
      this.$console = $(domNode);
    }
  }

  handleMouseOver(){
    this.autoscroll = false;
  }

  handleMouseOut(){
    this.autoscroll = true;
  }

  checkAutoscroll(){
    if (this.$console && this.autoscroll){
      this.$console.scrollTop(this.$console[0].scrollHeight - this.$console.height());
    }
  }

  addLine(text){
    this.setState(update(this.state, {
      lines: {$push: [text]}
    }));
    this.checkAutoscroll();
  }

  render() {
    return (
      <pre className={`console prettyprint 
          ${this.props.lang ? `lang-${this.props.lang}` : ""} 
          ${this.props.lines ? "linenums" : ""}`}
          style={{height: (this.props.height ? this.props.height : "auto")}}
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
          ref={this.setRef}

        >

        {this.state.lines.map(line => line + "\n")}
      </pre>
    );
  }
}

export default Console;
