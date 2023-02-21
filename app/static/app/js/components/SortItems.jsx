import React from 'react';
import '../css/SortItems.scss';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

class SortItems extends React.Component {
  static defaultProps = {
    items: []
  };

  static propTypes = {
    items: PropTypes.arrayOf(PropTypes.object)
  };

  constructor(props){
    super(props);

  }

  handleClick = (key, order) => {
    return () => {
      console.log(key, order);
    }
  }

  render() {
    return (<ul className="dropdown-menu dropdown-menu-right sort-items">
      <li className="sort-order-label">{_("Descending")}</li>
      {this.props.items.map(i => 
        <li key={i.key}><a onClick={this.handleClick(i.key, "desc")} className="sort-item">
          { i.label }
        </a></li>
      )}
      <li className="sort-order-label">{_("Ascending")}</li>
      {this.props.items.map(i => 
        <li key={i.key}><a onClick={this.handleClick(i.key, "asc")} className="sort-item">
          { i.label }
        </a></li>
      )}
    </ul>);
  }
}

export default SortItems;
