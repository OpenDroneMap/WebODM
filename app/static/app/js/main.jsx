import '../css/main.scss';
import './django/csrf';
import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from './Dashboard';
import MapView from './MapView';
import ModelView from './ModelView';
import Console from './Console';
import $ from 'jquery';

$(function(){
    $("[data-dashboard]").each(function(){
        ReactDOM.render(<Dashboard/>, $(this).get(0));
    });

    $("[data-mapview]").each(function(){
        let props = $(this).data();
        delete(props.mapview);
        ReactDOM.render(<MapView {...props}/>, $(this).get(0));
    });

    $("[data-modelview]").each(function(){
        let props = $(this).data();
        delete(props.modelview);
        ReactDOM.render(<ModelView {...props}/>, $(this).get(0));
    });

    $("[data-console]").each(function(){
        ReactDOM.render(<Console 
                lang={$(this).data("console-lang")}
                height={$(this).data("console-height")}
                autoscroll={typeof $(this).attr("autoscroll") !== 'undefined' && $(this).attr("autoscroll") !== false}
            >{$(this).text()}</Console>, $(this).get(0));
    });
});
