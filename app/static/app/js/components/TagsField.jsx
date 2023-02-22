import React from 'react';
import '../css/TagsField.scss';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

class TagsField extends React.Component {
  static defaultProps = {
  };

  static propTypes = {
  };

  constructor(props){
    super(props);

    this.state = {
    }
  }

  handleKeyDown = e => {
    if (e.key === "Tab"){
      e.preventDefault();
      e.stopPropagation();
      // TODO: add badge
    }
  }

  render() {
    return (<div contenteditable="true"
                className="form-control" 
                ref={(domNode) => this.inputText = domNode}
                onKeyDown={this.handleKeyDown}></div>);
  }
}

export default TagsField;
