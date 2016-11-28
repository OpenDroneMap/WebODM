import React from 'react';
import update from 'immutability-helper';

class Paginated extends React.Component{
  constructor(){
    super();
    this.handlePageChange = this.handlePageChange.bind(this);
  }

  updatePagination(itemsPerPage, totalItems){
    let currentPage = 1;
    const totalPages = this.totalPages(itemsPerPage, totalItems);

    if (this.state.pagination && this.state.pagination.currentPage !== undefined){
      currentPage = this.state.pagination.currentPage;
    }

    if (currentPage > totalPages) currentPage = totalPages;

    this.setState({pagination: {
        switchingPages: false,  
        itemsPerPage: itemsPerPage,
        totalItems: totalItems,
        currentPage: currentPage
      }
    });
  }

  totalPages(itemsPerPage, totalItems){
    return Math.ceil(totalItems / itemsPerPage);
  }

  getPaginatedUrl(base){
    const page = this.state.pagination && this.state.pagination.currentPage !== undefined
                 ? this.state.pagination.currentPage 
                 : 1;

    return base.replace(/#\{PAGE\}/g, page);
  }

  setPaginationState(props, done){
    this.setState(update(this.state, {
      pagination: {
        $merge: props
      }
    }), done);
  }

  handlePageChange(pageNum){
    return (e) => {
      // Update current page, once rendering is completed, raise 
      // on page changed event
      this.setPaginationState({
          currentPage: pageNum,
          switchingPages: true
        }, () => {
          if (this.onPageChanged) this.onPageChanged(pageNum);
        });
    }
  }

  handlePageItemsNumChange(delta, needsRefreshCallback){
    const pagesBefore = this.totalPages(this.state.pagination.itemsPerPage, this.state.pagination.totalItems),
          pagesAfter = this.totalPages(this.state.pagination.itemsPerPage, this.state.pagination.totalItems + delta);
    let currentPage = this.state.pagination.currentPage;

    if (currentPage > pagesAfter) currentPage = pagesAfter;

    this.setPaginationState({
      totalItems: this.state.pagination.totalItems + delta,
      currentPage: currentPage
    }, () => {
      if (pagesBefore !== pagesAfter) needsRefreshCallback(pagesAfter);
    });
  }

  render(){
    throw new Error("Override me");
  }
} 

export default Paginated;

