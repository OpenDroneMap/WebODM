import React from 'react';
import PropTypes from 'prop-types';

class UploadProgressBar extends React.Component {
  static propTypes = {
    progress: PropTypes.number,
    totalBytesSent: PropTypes.number,
    totalBytes: PropTypes.number,
    totalCount: PropTypes.number // number of files
  }

  // http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
  bytesToSize(bytes, decimals = 2){
   if(bytes == 0) return '0 byte';
   var k = 1000; // or 1024 for binary
   var dm = decimals || 3;
   var sizes = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  render() {
    let percentage = (this.props.progress !== undefined ? 
                     this.props.progress : 
                     0).toFixed(2);
    let bytes = this.props.totalBytesSent !== undefined && this.props.totalBytes !== undefined ? 
              `, remaining to upload: ${this.bytesToSize(this.props.totalBytes - this.props.totalBytesSent)}` : 
               "";

    let active = percentage < 100 ? "active" : "";

    let label = active ? 
                `${this.props.totalCount} files${bytes}` :
                `${this.props.totalCount} files uploaded successfully`;

    return (
      <div>
        <div className="progress">
          <div className={'progress-bar progress-bar-success progress-bar-striped ' + active} style={{width: percentage + '%'}}>
            {percentage}%
          </div>
        </div>
        <div className="text-left small">
          {label}
        </div>
      </div>
    );
  }
}

export default UploadProgressBar;
