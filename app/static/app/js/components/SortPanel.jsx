import React from 'react';
import '../css/SortPanel.scss';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

class SortPanel extends React.Component {
  static defaultProps = {
    items: [],
    onChange: () => {},
    selected: null
  };

  static propTypes = {
    items: PropTypes.arrayOf(PropTypes.object),
    onChange: PropTypes.func,
    selected: PropTypes.string
  };

  constructor(props){
    super(props);

    this.state = {
      items: props.items
    }

    if (props.selected){
      let normSortKey = props.selected.replace("-", "");
      this.state.items.forEach(s => {
          if (s.key === normSortKey) s.selected = props.selected[0] === "-" ? "desc" : "asc";
      });
    }
  }

  handleClick = (key, order) => {
    return () => {
      this.state.items.forEach(i => {
        i.selected = i.key === key ? order : false;
      });
      this.setState({
        items: this.state.items
      })
      this.props.onChange(order === "desc" ? "-" + key : key);
    }
  }

  render() {
    return (<ul className="dropdown-menu dropdown-menu-right sort-items">
      <li className="sort-order-label">{_("Descending")}</li>
      {this.state.items.map(i => 
        <li key={i.key}><a onClick={this.handleClick(i.key, "desc")} className="sort-item">
          { i.label } {i.selected === "desc" ? <i className="fa fa-check"></i> : ""}
        </a></li>
      )}
      <li className="sort-order-label">{_("Ascending")}</li>
      {this.state.items.map(i => 
        <li key={i.key}><a onClick={this.handleClick(i.key, "asc")} className="sort-item">
          { i.label } {i.selected === "asc" ? <i className="fa fa-check"></i> : ""}
        </a></li>
      )}
    </ul>);
  }
}

export default SortPanel;
