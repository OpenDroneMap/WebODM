import React from 'react';
import './css/Console.scss';
import './vendor/google-code-prettify/prettify';
import './vendor/google-code-prettify/prettify.css';
import update from 'immutability-helper';
import Utils from './classes/Utils';
import $ from 'jquery';
import { _, interpolate } from './classes/gettext';

class Console extends React.Component {
  constructor(props){
    super();

    this.state = {
      lines: []
    };

    if (typeof props.children === "string"){
      this.state.lines = props.children.split('\n');
      if (props.onAddLines) props.onAddLines(this.state.lines);
    }

    this.autoscroll = props.autoscroll === true;
    this.showFullscreenButton = props.showFullscreenButton === true;

    this.setRef = this.setRef.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.downloadTxt = this.downloadTxt.bind(this);
    this.enterFullscreen = this.enterFullscreen.bind(this);
    this.exitFullscreen = this.exitFullscreen.bind(this);
  }

  componentDidMount(){
    this.checkAutoscroll();
    this.setupDynamicSource();
  }

  setupDynamicSource(){
    if (this.props.source !== undefined){
      const updateFromSource = () => {
        let sourceUrl = typeof this.props.source === 'function' ?
                       this.props.source(this.state.lines.length) :
                       this.props.source;

        // Fetch
        this.sourceRequest = $.get(sourceUrl, text => {
          if (text !== ""){
            let lines = text.split("\n");
            this.addLines(lines);
          }
        })
        .always((_, textStatus) => {
          if (textStatus !== "abort" && this.props.refreshInterval !== undefined){
            this.sourceTimeout = setTimeout(updateFromSource, this.props.refreshInterval);
          }
          this.checkAutoscroll();
        });
      };

      updateFromSource();
    }
  }

  clear(){
    this.tearDownDynamicSource();
    this.setState({lines: []});
    this.setupDynamicSource();
  }

  downloadTxt(filename="console.txt"){
    Utils.saveAs(this.state.lines.join("\n"), filename);
  }

  enterFullscreen(){
    const consoleElem = this.$console.get(0);
    if (consoleElem.requestFullscreen) {
        consoleElem.requestFullscreen();
    }
  }

  exitFullscreen(){
    if (document.exitFullscreen){
        document.exitFullscreen();
    }
  }

  tearDownDynamicSource(){
    if (this.sourceTimeout) clearTimeout(this.sourceTimeout);
    if (this.sourceRequest) this.sourceRequest.abort();
  }

  componentWillUnmount(){
    this.tearDownDynamicSource();
  }

  setRef(domNode){
    if (domNode != null){
      this.$console = $(domNode);
    }
  }

  handleMouseOver(){
    this.autoscroll = false;
  }

  handleMouseOut(){
    this.autoscroll = this.props.autoscroll === true;
  }

  checkAutoscroll(){
    if (this.$console && this.autoscroll){
      this.$console.scrollTop(this.$console[0].scrollHeight - this.$console.height());
    }
  }

  addLines(lines){
    if (!Array.isArray(lines)) lines = [lines];
    this.setState(update(this.state, {
      lines: {$push: lines}
    }));
    this.checkAutoscroll();
    if (this.props.onAddLines) this.props.onAddLines(lines);
  }

  render() {
    const prettyLine = (line) => {
      return {__html: prettyPrintOne(Utils.escapeHtml(line), this.props.lang, this.props.lines)};
    }
    let i = 0;

    let lines = this.state.lines;
    if (this.props.maximumLines && lines.length > this.props.maximumLines){
        lines = lines.slice(-this.props.maximumLines);
        lines.unshift('... ' + interpolate(_("output truncated at %(count)s lines"), { lines: this.props.maximumLines }) + ' ...');
    }

    const items = [
        <pre key="console" className={`console prettyprint
            ${this.props.lang ? `lang-${this.props.lang}` : ""}
            ${this.props.lines ? "linenums" : ""}
            ${this.props.className || ""}`}
            style={{height: (this.props.height ? this.props.height : "auto")}}
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            ref={this.setRef}
            ><a href="javascript:void(0);" onClick={this.exitFullscreen} className="exit-fullscreen btn btn-sm btn-primary" title={_("Toggle Fullscreen")}>
                <i className="fa fa-expand"></i> {_("Exit Fullscreen")}
            </a>
            {lines.map(line => {
            if (this.props.lang) return (<div key={i++} dangerouslySetInnerHTML={prettyLine(line)}></div>);
            else return line + "\n";
            })}
            {"\n"}
            <a href="javascript:void(0);" onClick={this.exitFullscreen} className="exit-fullscreen btn btn-sm btn-primary" title={_("Toggle Fullscreen")}>
                <i className="fa fa-expand"></i> {_("Exit Fullscreen")}
            </a>
        </pre>];

    if (this.props.showConsoleButtons){
        items.push(<div key="buttons" className="console-buttons">
            <a href="javascript:void(0);" onClick={() => this.downloadTxt()} className="btn btn-sm btn-primary" title={_("Download To File")}>
                <i className="fa fa-download"></i>
            </a>
            <a href="javascript:void(0);" onClick={this.enterFullscreen} className="btn btn-sm btn-primary" title={_("Toggle Fullscreen")}>
                <i className="fa fa-expand"></i>
            </a>
        </div>);
    }

    return items;
  }
}

$(function(){
    $("[data-console]").each(function(){
        window.ReactDOM.render(<Console
                lang={$(this).data("console-lang")}
                height={$(this).data("console-height")}
                autoscroll={typeof $(this).attr("autoscroll") !== 'undefined' && $(this).attr("autoscroll") !== false}
            >{$(this).text()}</Console>, $(this).get(0));
    });
});

export default Console;
