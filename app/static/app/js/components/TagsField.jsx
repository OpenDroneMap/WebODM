import React from 'react';
import '../css/TagsField.scss';
import PropTypes from 'prop-types';
import update from 'immutability-helper';
import { _ } from '../classes/gettext';
import Tags from '../classes/Tags';

class TagsField extends React.Component {
  static defaultProps = {
    tags: [],
    onUpdate: () => {}
  };

  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    onUpdate: PropTypes.func
  };

  constructor(props){
    super(props);

    this.state = {
      userTags: Tags.userTags(props.tags),
      systemTags: Tags.systemTags(props.tags)
    }

    this.dzList = [];
    this.domTags = [];
  }

  componentDidUpdate(){
    this.props.onUpdate(Tags.combine(this.state.userTags, this.state.systemTags));
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
    if (e.key === "Tab" || e.key === "Enter" || e.key === "," || e.key === " "){
      e.preventDefault();
      e.stopPropagation();
      this.addTag();
    }else if (e.key === "Backspace" && this.inputText.innerText === ""){
      this.removeTag(this.state.userTags.length - 1);
    }
  }

  focus = () => {
    this.inputText.focus();
  }

  stop = e => {
    e.stopPropagation();
  }

  handleRemoveTag = idx => {
    return e => {
      e.stopPropagation();
      this.removeTag(idx);
    }
  }

  removeTag = idx => {
    this.setState(update(this.state, { userTags: { $splice: [[idx, 1]] } }));
  }

  addTag = () => {
    let text = this.inputText.innerText;
    if (text !== ""){
      // Do not allow system tags
      if (!text.startsWith(".")){

        // Only lower case text allowed
        text = text.toLowerCase();

        // Check for dulicates
        if (this.state.userTags.indexOf(text) === -1){
          this.setState(update(this.state, {
            userTags: {$push: [text]}
          }));
        }
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

    const { userTags } = this.state;
    if (moveTag){
      const dragIdx = userTags.indexOf(dragTag);
      const moveIdx = userTags.indexOf(moveTag);
      if (dragIdx !== -1 && moveIdx !== -1){
        if (dragIdx === moveIdx) return;
        else{
          // Put drag tag in front of move tag
          let insertIdx = side === "right" ? moveIdx + 1 : moveIdx;
          userTags.splice(insertIdx, 0, dragTag);
          for (let i = 0; i < userTags.length; i++){
            if (userTags[i] === dragTag && i !== insertIdx){
              userTags.splice(i, 1);
              break;
            }
          }
          this.setState({userTags});
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
    const { userTags } = this.state;

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
          closestTag = userTags[i];
          minDistX = sqDistX;
        }
      }
    });

    let side = "right";
    if (closestTag){
      const b = this.domTags[this.state.userTags.indexOf(closestTag)].getBoundingClientRect();
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
                className="form-control tags-field">{this.state.userTags.map((tag, i) => 
                  <div draggable="true" className="tag-badge" key={i} ref={domNode => this.domTags[i] = domNode} 
                      onClick={this.stop} 
                      onDragStart={this.handleDragStart(tag)} 
                      onDragEnd={this.handleDragEnd}>{tag} <a href="javascript:void(0)" onClick={this.handleRemoveTag(i)}>×</a>&nbsp;&nbsp;</div>
                )}
                <div className="inputText" contentEditable="true" ref={(domNode) => this.inputText = domNode}
                     onKeyDown={this.handleKeyDown}
                     onBlur={this.addTag}></div>
        </div>);
  }
}

export default TagsField;
