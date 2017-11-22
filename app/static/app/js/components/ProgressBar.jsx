import React from 'react';
import PropTypes from 'prop-types';

class ProgressBar extends React.Component {
  static propTypes = {
    current: PropTypes.number.isRequired, // processed files so far
    total: PropTypes.number.isRequired, // number of files
    template: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func
    ]).isRequired // String or callback for label
  }

  render() {
    let { current, total } = this.props;
    if (total == 0) total = 1;

    const percentage = ((current / total) * 100).toFixed(2);
    const active = percentage < 100 ? "active" : "";

    const label = typeof this.props.template === 'string' ?
                this.props.template : 
                this.props.template({current, total, active, percentage});

    return (
      <div>
        <div className="progress">
          <div className={'progress-bar progress-bar-success progress-bar-striped ' + active} style={{width: percentage + '%'}}>
            {percentage}%
          </div>
        </div>
        {label !== "" ? 
          <div className="text-left small">
            {label}
          </div>
        : ""}
      </div>
    );
  }
}

export default ProgressBar;
