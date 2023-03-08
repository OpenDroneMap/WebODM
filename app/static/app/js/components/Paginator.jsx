import React from 'react';
import '../css/Paginator.scss';
import { Link, withRouter  } from 'react-router-dom';
import SortPanel from './SortPanel';
import Utils from '../classes/Utils';
import { _ } from '../classes/gettext';

class Paginator extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            showSearch: false,
            sortKey: "-created_at"
        }

        this.sortItems = [{
            key: "created_at",
            label: _("Created on"),
            selected: "desc"
          },{
            key: "name",
            label: _("Name")
          },{
            key: "tags",
            label: _("Tags")
          }];
    }

    toggleSearch = () => {

    }

    sortChanged = key => {
        this.setState({sortKey: key});
        setTimeout(() => {
            this.props.history.push({search: this.getQueryForPage(this.props.currentPage)});
        }, 0);
    }

    getQueryForPage = (num) => {
        return Utils.toSearchQuery({
            page: num,
            ordering: this.state.sortKey
        });
    }

    render() {
        const { itemsPerPage, totalItems, currentPage } = this.props;
        let paginator = null;
        let toolbar = (
            <ul className="pagination pagination-sm toolbar">
                <li><a href="javascript:void(0);" onClick={this.toggleSearch} title={_("Search")}><i className="fa fa-search"></i></a></li>
                <li><a href="javascript:void(0);"><i className="fa fa-filter" title={_("Filter")}></i></a></li>
                <li className="btn-group">
                    <a href="javascript:void(0);" className="dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i className="fa fa-sort-alpha-down" title={_("Sort")}></i></a>
                    <SortPanel items={this.sortItems} onChange={this.sortChanged} />
                </li>
            </ul>
        );

        if (itemsPerPage && itemsPerPage && totalItems > itemsPerPage){
            const numPages = Math.ceil(totalItems / itemsPerPage),
                  pages = [...Array(numPages).keys()]; // [0, 1, 2, ...numPages]
            
            paginator = (
                <ul className="pagination pagination-sm">
                    <li className={currentPage === 1 ? "disabled" : ""}>
                      <Link to={{search: this.getQueryForPage(1)}}>
                        <span>&laquo;</span>
                      </Link>
                    </li>
                    {pages.map(page => {
                        return (<li
                            key={page + 1}
                            className={currentPage === (page + 1) ? "active" : ""}
                        ><Link to={{search: this.getQueryForPage(page + 1)}}>{page + 1}</Link></li>);
                    })}
                    <li className={currentPage === numPages ? "disabled" : ""}>
                      <Link to={{search: this.getQueryForPage(numPages)}}>
                        <span>&raquo;</span>
                      </Link>
                    </li>
                </ul>
              );
        }

        return [
            <div key="0" className="text-right paginator">{toolbar}{paginator}</div>,
            this.props.children,
            <div key="2" className="text-right paginator">{paginator}</div>,
        ];
    }
}

export default withRouter(Paginator);
