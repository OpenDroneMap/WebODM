import React from 'react';
import '../css/ShareButton.scss';
import SharePanel from './SharePanel';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ShareButton extends React.Component {
  static defaultProps = {
    task: null,
  };
  static propTypes = {
    task: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(){
  }

  componentDidMount(){
    const $container = $("<div/>");
    
    $(this.shareButton).popover({
        container: 'body',
        animation: false,
        content: function(){
          window.ReactDOM.render(<SharePanel />, $container.get(0));
          return $container;
        },
        html: true,
        placement: 'top',
        title: "Share"
      }).on("shown.bs.popover", () => {

      }).on("hidden.bs.popover", () => {

      });
  }

  componentWillUnmount(){
    $(this.shareButton).popover('dispose');
  }

  render() {
    return (
      <button 
        ref={(domNode) => { this.shareButton = domNode; }}
        type="button"
        className={"shareButton btn btn-sm " + (this.props.task.public ? "btn-primary" : "btn-secondary")}>
        <i className="fa fa-share-alt"></i> Share
      </button>
    );
  }
}

export default ShareButton;
