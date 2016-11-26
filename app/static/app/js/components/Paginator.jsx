import React from 'react';
import $ from 'jquery';

class Paginator extends React.Component {
    render() {
        const { itemsPerPage, totalItems, currentPage } = this.props;
        let paginator = null;

        if (itemsPerPage && itemsPerPage && totalItems > itemsPerPage){
            const numPages = Math.ceil(totalItems / itemsPerPage),
                  pages = [...Array(numPages).keys()]; // [0, 1, 2, ...numPages]

            paginator = (
                <div className={this.props.className}>
                    <ul className="pagination pagination-sm">
                        <li className={currentPage === 1 ? "disabled" : ""}>
                          <a href="javascript:void(0);" onClick={this.props.handlePageChange(1)}>
                            <span>&laquo;</span>
                          </a>
                        </li>
                        {pages.map(page => {
                            return (<li     
                                key={page + 1}
                                className={currentPage === (page + 1) ? "active" : ""}
                            ><a href="javascript:void(0);" onClick={this.props.handlePageChange(page + 1)}>{page + 1}</a></li>);
                        })}
                        <li className={currentPage === numPages ? "disabled" : ""}>
                          <a href="javascript:void(0);" onClick={this.props.handlePageChange(numPages)}>
                            <span>&raquo;</span>
                          </a>
                        </li>
                    </ul>
                </div>
                );
        }

        return (<div>
            {paginator}
            {this.props.children}
            {paginator}
        </div>);
    }
}

export default Paginator;
