import React from 'react';
import { Link } from 'react-router-dom';

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
                          <Link to={{search: "?page=1"}}>
                            <span>&laquo;</span>
                          </Link>
                        </li>
                        {pages.map(page => {
                            return (<li     
                                key={page + 1}
                                className={currentPage === (page + 1) ? "active" : ""}
                            ><Link to={{search: "?page=" + (page + 1)}}>{page + 1}</Link></li>);
                        })}
                        <li className={currentPage === numPages ? "disabled" : ""}>
                          <Link to={{search: "?page=" + numPages}}>
                            <span>&raquo;</span>
                          </Link>
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
