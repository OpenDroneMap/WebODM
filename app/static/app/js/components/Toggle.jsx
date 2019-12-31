import React from 'react';
import PropTypes from 'prop-types';
import '../css/Toggle.scss';

class Toggle extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    bind: PropTypes.array.isRequired, // two element array, 
                                    // with first element being the parent element 
                                    // and the second the boolean property to determine visibility
                                    // ex. [this, 'visible']
    trueIcon: PropTypes.string,
    falseIcon: PropTypes.string
  }

  constructor(props){
    super(props);
  }

  handleClick = () => {
    const [parent, prop] = this.props.bind;
    parent.setState({[prop]: !parent.state[prop]});
  }

  render(){
    const [parent, prop] = this.props.bind;
    const icon = parent.state[prop] ? this.props.trueIcon: this.props.falseIcon;
    return (<a className="toggle" href="javascript:void(0);" onClick={this.handleClick}><i className={icon}></i></a>);
  }
}

class Checkbox extends Toggle{
    static defaultProps = {
        trueIcon: "far fa-check-square",
        falseIcon: "far fa-square"
    }
}

class ExpandButton extends Toggle{
    static defaultProps = {
        trueIcon: "fa fa-caret-down",
        falseIcon: "fa fa-caret-right"
    }
}

export {
    Toggle,
    Checkbox,
    ExpandButton
}