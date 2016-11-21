import React from 'react';

/*abstract*/ class Paginated extends React.Component{
  constructor(){
    super();
  }

  setupPagination(itemsPerPage, totalItems){
    let currentPage = 1;
    if (this.state.pagination && this.state.pagination.currentPage !== undefined){
      currentPage = this.state.pagination.currentPage;
    }

    this.setState({pagination: {
          itemsPerPage: itemsPerPage,
          totalItems: totalItems,
          currentPage: currentPage
      }
    });
  }

  getPaginatedUrl(base, page){
    return base.replace(/#\{PAGE\}/g, page);
  }

  render(){
    throw new Error("Override me");
  }
} 

export default Paginated;

