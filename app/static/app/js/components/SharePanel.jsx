import React from 'react';
import '../css/SharePanel.scss';
import PropTypes from 'prop-types';


class SharePanel extends React.Component{
  static propTypes = {
    sharingEnabled: PropTypes.bool
  };
  static defaultProps = {
    sharingEnabled: true
  };

  constructor(props){
    super(props);

    this.state = {
      sharingEnabled: props.sharingEnabled
    };

    this.handleSharingEnabled = this.handleSharingEnabled.bind(this);
  }

  handleSharingEnabled(e){
    this.setState({ sharingEnabled: e.target.checked });
  }

  render(){
    return (<div className="sharePanel">
        <div className="checkbox">
          <label>
            <input 
              type="checkbox" 
              checked={this.state.sharingEnabled}
              onChange={this.handleSharingEnabled}
               />
            Enable sharing
          </label>
        </div>
        
      </div>);
  }
}

export default SharePanel;