import React from 'react';
import '../css/TagsField.scss';
import PropTypes from 'prop-types';
import update from 'immutability-helper';
import { _ } from '../classes/gettext';

class TagsField extends React.Component {
  static defaultProps = {
    tags: ["abc"]
  };

  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string)
  };

  constructor(props){
    super(props);

    this.state = {
      tags: props.tags
    }
  }

  handleKeyDown = e => {
    if (e.key === "Tab" || e.key === "Enter"){
      e.preventDefault();
      e.stopPropagation();
      this.addTag();
    }
  }

  focus = () => {
    this.inputText.focus();
  }

  stop = e => {
    e.stopPropagation();
  }

  removeTag = idx => {
    return e => {
      e.stopPropagation();
      
      // TODO
    }
  }

  addTag = () => {
    const text = this.inputText.innerText;
    if (text !== ""){
      // Check for dulicates
      if (this.state.tags.indexOf(text) === -1){
        this.setState(update(this.state, {
          tags: {$push: [text]}
        }));
      }
      this.inputText.innerText = "";
    }
  }

  render() {
    return (<div
                spellcheck="false"
                autocomplete="off"
                onClick={this.focus}
                className="form-control tags-field">{this.state.tags.map((tag, i) => 
                  <div className="tag-badge" key={i} onClick={this.stop}>{tag} <a href="javascript:void(0)" onClick={this.removeTag(i)}>×</a>&nbsp;&nbsp;</div>
                )}
                <div className="inputText" contenteditable="true" ref={(domNode) => this.inputText = domNode}
                     onKeyDown={this.handleKeyDown}
                     onBlur={this.addTag}></div>
        </div>);
  }
}

export default TagsField;
