import React from 'react';
import '../css/TagsField.scss';
import PropTypes from 'prop-types';
import update from 'immutability-helper';
import { _ } from '../classes/gettext';

class TagsField extends React.Component {
  static defaultProps = {
    tags: ["abc", "123", "xyz", "aaaaaaaaaaaaaaaa", "bbbbbbbbbbbb", "ccccccccccc", "dddddddddddd"]
  };

  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string)
  };

  constructor(props){
    super(props);

    this.state = {
      tags: props.tags
    }

    this.dzList = [];
    this.domTags = [];
  }

  componentWillUnmount(){
    this.restoreDropzones();
  }

  disableDropzones(){
    if (this.disabledDz) return;
    let parent = this.domNode.parentElement;
    while(parent){
      if (parent.dropzone){
        parent.dropzone.removeListeners();
        this.dzList.push(parent.dropzone);
      }
      parent = parent.parentElement;
    }
    this.disabledDz = true;
  }

  restoreDropzones(){
    if (!this.disabledDz) return;

    this.dzList.forEach(dz => {
      dz.restoreListeners();
    });
    this.dzList = [];
    this.disabledDz = false;
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
      
      this.setState(update(this.state, { tags: { $splice: [[idx, 1]] } }));
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

  handleDragStart = tag => {
    return e => {
      this.disableDropzones();
      e.stopPropagation();
      e.dataTransfer.setData("application/tag", tag);
      e.dataTransfer.dropEffect = "move";
    }
  }

  handleDrop = e => {
    e.preventDefault();
    const dragTag = e.dataTransfer.getData("application/tag");
    const [moveTag, side] = this.findClosestTag(e.clientX, e.clientY);

    const { tags } = this.state;
    if (moveTag){
      const dragIdx = tags.indexOf(dragTag);
      const moveIdx = tags.indexOf(moveTag);
      if (dragIdx !== -1 && moveIdx !== -1){
        if (dragIdx === moveIdx) return;
        else{
          // Put drag tag in front of move tag
          let insertIdx = side === "right" ? moveIdx + 1 : moveIdx;
          tags.splice(insertIdx, 0, dragTag);
          for (let i = 0; i < tags.length; i++){
            if (tags[i] === dragTag && i !== insertIdx){
              tags.splice(i, 1);
              break;
            }
          }
          this.setState({tags});
        }
      }
    }
  }
  handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  handleDragEnter = e => {
    e.preventDefault();
  }
  handleDragEnd = () => {
    this.restoreDropzones();
  }

  findClosestTag = (clientX, clientY) => {
    let closestTag = null;
    let minDistX = Infinity, minDistY = Infinity;
    let rowTagY = null;
    const { tags } = this.state;
    const row = [];

    // Find tags in closest row
    this.domTags.forEach((domTag, i) => {
      const b = domTag.getBoundingClientRect();
      const tagY = b.y + (b.height / 2);
      let dy = clientY - tagY,
          sqDistY = dy*dy;
      
      if (sqDistY < minDistY){
        minDistY = sqDistY;
        rowTagY = tagY;
      }
    });

    if (!rowTagY) return [null, ""];

    // From row, find closest in X
    this.domTags.forEach((domTag, i) => {
      const b = domTag.getBoundingClientRect();
      const tagY = b.y + (b.height / 2);
      if (Math.abs(tagY - rowTagY) < 0.001){
        const tagX = b.x + b.width;
        let dx = clientX - tagX,
            sqDistX = dx*dx;
        if (sqDistX < minDistX){
          closestTag = tags[i];
          minDistX = sqDistX;
        }
      }
    });

    let side = "right";
    if (closestTag){
      const b = this.domTags[this.state.tags.indexOf(closestTag)].getBoundingClientRect();
      const centerX = b.x + b.width / 2.0;
      if (clientX < centerX) side = "left";
    }

    return [closestTag, side];
  }

  render() {
    return (<div
                ref={domNode => this.domNode = domNode}
                spellCheck="false"
                autoComplete="off"
                onClick={this.focus}
                onDrop={this.handleDrop}
                onDragOver={this.handleDragOver}
                onDragEnter={this.handleDragEnter}
                className="form-control tags-field">{this.state.tags.map((tag, i) => 
                  <div draggable="true" className="tag-badge" key={i} ref={domNode => this.domTags[i] = domNode} 
                      onClick={this.stop} 
                      onDragStart={this.handleDragStart(tag)} 
                      onDragEnd={this.handleDragEnd}>{tag} <a href="javascript:void(0)" onClick={this.removeTag(i)}>×</a>&nbsp;&nbsp;</div>
                )}
                <div className="inputText" contentEditable="true" ref={(domNode) => this.inputText = domNode}
                     onKeyDown={this.handleKeyDown}
                     onBlur={this.addTag}></div>
        </div>);
  }
}

export default TagsField;
