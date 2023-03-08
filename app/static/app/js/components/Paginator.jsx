import React from 'react';
import '../css/Paginator.scss';
import { Link } from 'react-router-dom';
import { _ } from '../classes/gettext';

class Paginator extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            showSearch: false
        }
    }

    toggleSearch = () => {

    }

    render() {
        const { itemsPerPage, totalItems, currentPage } = this.props;
        let paginator = null;
        let toolbar = (
            <ul className="pagination pagination-sm toolbar">
                <li><a href="javascript:void(0);" onClick={this.toggleSearch} title={_("Search")}><i class="fa fa-search"></i></a></li>
                <li><a href="javascript:void(0);"><i class="fa fa-filter" title={_("Filter")}></i></a></li>
                <li><a href="javascript:void(0);"><i class="fa fa-sort-alpha-down" title={_("Sort")}></i></a></li>
            </ul>
        );

        if (itemsPerPage && itemsPerPage && totalItems > itemsPerPage){
            const numPages = Math.ceil(totalItems / itemsPerPage),
                  pages = [...Array(numPages).keys()]; // [0, 1, 2, ...numPages]
            
            paginator = (
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
              );
        }

        return [
            <div className="text-right paginator">{toolbar}{paginator}</div>,
            this.props.children,
            <div className="text-right paginator">{paginator}</div>,
        ];
    }
}

export default Paginator;
