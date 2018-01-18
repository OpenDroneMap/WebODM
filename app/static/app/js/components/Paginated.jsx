import React from 'react';
import update from 'immutability-helper';
import HistoryNav from '../classes/HistoryNav';
import PropTypes from 'prop-types';

class Paginated extends React.Component{
  static defaultProps = {
    currentPage: 1
  };

  static propTypes = {
      history: PropTypes.object.isRequired, // reference to the history object coming from the route this component is bound to
      currentPage: PropTypes.number
  };

  constructor(props){
    super(props);

    this.historyNav = new HistoryNav(props.history);
  }

  updatePagination(itemsPerPage, totalItems){
    let currentPage = this.props.currentPage;
    const totalPages = this.totalPages(itemsPerPage, totalItems);

    if (currentPage > totalPages) currentPage = totalPages;

    this.setState({pagination: {
        switchingPages: false,
        itemsPerPage: itemsPerPage,
        totalItems: totalItems
      }
    });
  }

  totalPages(itemsPerPage, totalItems){
    let pages = Math.ceil(totalItems / itemsPerPage);
    if (pages < 1) pages = 1;
    return pages;
  }

  setPaginationState(props, done){
    this.setState(update(this.state, {
      pagination: {
        $merge: props
      }
    }), done);
  }

  handlePageItemsNumChange(delta, needsRefreshCallback){
    let currentPage = this.props.currentPage;
    const pagesBefore = this.totalPages(this.state.pagination.itemsPerPage, this.state.pagination.totalItems),
          pagesAfter = this.totalPages(this.state.pagination.itemsPerPage, this.state.pagination.totalItems + delta);

    if (currentPage > pagesAfter) currentPage = pagesAfter;

    this.historyNav.changeQS('page', currentPage);

    this.setPaginationState({
      totalItems: this.state.pagination.totalItems + delta
    }, () => {
      if (pagesBefore !== pagesAfter) needsRefreshCallback(pagesAfter);
    });
  }

  render(){
    throw new Error("Override me");
  }
} 

export default Paginated;

