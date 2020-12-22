import React from 'react';
import PropTypes from 'prop-types';
import { interpolate } from '../classes/gettext';

class Trans extends React.Component {
  static propTypes = {
      params: PropTypes.object
  }

  static defaultProps = {
    params: {}
  };

  render() {
      if (!this.props.children) return (<span/>);

      let content = "";
      if (typeof this.props.children === "string"){
        content = (<span dangerouslySetInnerHTML={{__html: interpolate(this.props.children, this.props.params)}}></span>);
      }else{
          content = [];
          let i = 0;
          this.props.children.forEach(c => {
            if (typeof c === "string"){
                content.push(<span key={i} dangerouslySetInnerHTML={{__html: interpolate(c, this.props.params)}}>
                            </span>);
            }else{
                content.push(<span key={i}>{c}</span>);
            }
            i++;
          });
      }

      return content;
  }
}

export default Trans;
