import '../css/UploadProgressBar.scss';
import React from 'react';
import PropTypes from 'prop-types';
import { _, interpolate } from '../classes/gettext';
import Utils from '../classes/Utils';

class UploadProgressBar extends React.Component {
  static propTypes = {
    progress: PropTypes.number,
    totalBytesSent: PropTypes.number,
    totalBytes: PropTypes.number,
    totalCount: PropTypes.number // number of files
  }

  render() {
    let percentage = (this.props.progress !== undefined ? 
                     this.props.progress : 
                     0).toFixed(2);
    let bytes = this.props.totalBytesSent !== undefined && this.props.totalBytes !== undefined ? 
              ' ' + interpolate(_("remaining to upload: %(bytes)s"), { bytes: Utils.bytesToSize(this.props.totalBytes - this.props.totalBytesSent)}) : 
               "";

    let active = percentage < 100 ? "active" : "";

    let label = active ? 
                interpolate(_('%(count)s files %(remaining)s'), { count: this.props.totalCount, remaining: bytes }) :
                interpolate(_('%(count)s files uploaded successfully'), { count: this.props.totalCount });

    return (
      <div className="upload-progress-bar">
        <div className="progress">
          <div className={'progress-bar progress-bar-success progress-bar-striped ' + active} style={{width: percentage + '%'}}>
            {percentage}%
          </div>
        </div>
        <div className="text-left small upload-label">
          {label}
        </div>
      </div>
    );
  }
}

export default UploadProgressBar;
