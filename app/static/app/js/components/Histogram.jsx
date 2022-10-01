import React from 'react';
import PropTypes from 'prop-types';
import '../css/Histogram.scss';
import d3 from 'd3';
import { _ } from '../classes/gettext';

export default class Histogram extends React.Component {
  static defaultProps = {
      width: 280,
      colorMap: null,
      onUpdate: null,
      loading: false,
  };
  static propTypes = {
      statistics: PropTypes.object.isRequired,
      colorMap: PropTypes.array,
      width: PropTypes.number,
      onUpdate: PropTypes.func,
      loading: PropTypes.bool
  }

  constructor(props){
    super(props);

    // Colors in absence of a color map
    this.defaultBandColors = [
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ff8000',
        '#ffff00',
        '#00ff80',
        '#00ffff',
        '#0080ff',
    ];

    this.reset();
  }

  reset = () => {
    const minY = 0;
    let maxY = 0;
    let minX = 2147483647;
    let maxX = -2147483646;

    for (let i in this.props.statistics){
        const band = this.props.statistics[i];
        minX = Math.min(minX, band.min);
        maxX = Math.max(maxX, band.max);
        maxY = Math.max(maxY, Math.max(...band.histogram[0]));
    }

    this.rangeX = [minX, maxX];
    this.rangeY = [minY, maxY];

    const st = {
        min: minX.toFixed(3),
        max: maxX.toFixed(3),
        minInput: minX.toFixed(3),
        maxInput: maxX.toFixed(3)
    };

    if (!this.state){
        this.state = st;
    }else{
        this.setState(st);
    }    
  }

  redraw = () => {
    let margin = {top: 5, right: 10, bottom: 15, left: 10},
    width = this.props.width - margin.left - margin.right,
    height = 85 - margin.top - margin.bottom;

    if (this.hgContainer.firstElementChild){
        this.hgContainer.removeChild(this.hgContainer.firstElementChild);
    }

    const svgContainer = d3.select(this.hgContainer)
        .append("svg")
        .attr('class', 'histogram-container')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    if (this.props.colorMap){
        this.colorMapElem = svgContainer.append("defs")
                    .append("linearGradient")
                    .attr('id', 'linear')
                    .attr('x1', '0%')
                    .attr('y1', '0%')
                    .attr('x2', '100%')
                    .attr('y2', '0%');
        this.updateColorMap(true);
    }

    let svg = svgContainer.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

    // add the x Axis
    let x = d3.scale.linear()
                .domain(this.rangeX)
                .range([0, width]);

    svg.append("g")
        .attr("class", "x axis theme-fill-primary")
        .attr("transform", "translate(0," + (height - 5) + ")")
        .call(d3.svg.axis().scale(x).tickValues(this.rangeX).orient("bottom"));

    // add the y Axis
    let y = d3.scale.linear()
            .domain(this.rangeY)
            .range([height, 0]);

    for (let i in this.props.statistics){
        const band = this.props.statistics[i];
        const data = band.histogram[0].map((e, i) => {
            return [band.histogram[1][i], e];
        });

        // Make sure histogram starts and ends at 0
        // to prevent oblique looking charts
        data.unshift([data[0][0], 0]);
        data.push([data[data.length - 1][0], 0]);

        // Plot the area
        svg.append('g')
           .append("path")
           .datum(data)
           .attr("fill", !this.colorMapElem ? this.defaultBandColors[i - 1] : 'url(#linear)')
           .attr("opacity", 1 / Object.keys(this.props.statistics).length)
           .attr("d",  d3.svg.line()
                               .x(function(d) { return x(d[0]); })
                               .y(function(d) { return y(d[1]); })
           );
    }

    // Add sliders
    this.maxDown = false;
    this.minDown = false;
    let maxPosX = null;
    let minPosX = null;

    const minXStart = ((this.state.min - this.rangeX[0]) / (this.rangeX[1] - this.rangeX[0])) * width;
    const minLine = svg.append('g')
       .append('line')
       .attr('x1', minXStart)
       .attr('y1', 0)
       .attr('x2', minXStart)
       .attr('y2', height)
       .attr('class', 'theme-stroke-primary slider-line min')
       .on("mousedown", function(){ self.maxDown = false; self.minDown = true; })[0][0];
       

    const maxXStart = ((this.state.max - this.rangeX[0]) / (this.rangeX[1] - this.rangeX[0])) * width;
    const maxLine = svg.append('g')
       .append('line')
       .attr('x1', maxXStart)
       .attr('y1', 0)
       .attr('x2', maxXStart)
       .attr('y2', height)
       .attr('class', 'theme-stroke-primary slider-line max')
       .on("mousedown", function(){ self.minDown = false; self.maxDown = true; })[0][0];

    const handleLeave = () => {
        this.maxDown = this.minDown = false;
        maxPosX = null;
        minPosX = null;
    };

    const self = this;

    const handleMoveMax = function(){
        if (self.maxDown){
            const mouseX = (d3.mouse(this))[0];
            if (!maxPosX) maxPosX = mouseX;

            const deltaX = mouseX - maxPosX;
            const prevX = parseInt(maxLine.getAttribute('x1'));
            const newX = Math.max(Math.min(width, prevX + deltaX), parseInt(minLine.getAttribute('x1')));
            maxPosX = mouseX;
            maxLine.setAttribute('x1', newX);
            maxLine.setAttribute('x2', newX);

            if (prevX !== newX){
                self.setState({max: (self.rangeX[0] + ((self.rangeX[1] - self.rangeX[0]) / width) * newX).toFixed(3)});
            }
        }
    };

    const handleMoveMin = function(){
        if (self.minDown){
            const mouseX = (d3.mouse(this))[0];
            if (!minPosX) minPosX = mouseX;

            const deltaX = mouseX - minPosX;
            const prevX = parseInt(minLine.getAttribute('x1'));
            const newX = Math.max(0, Math.min(prevX + deltaX, parseInt(maxLine.getAttribute('x1'))));
            minPosX = mouseX;
            minLine.setAttribute('x1', newX);
            minLine.setAttribute('x2', newX);

            if (prevX !== newX){
                self.setState({min: (self.rangeX[0] + ((self.rangeX[1] - self.rangeX[0]) / width) * newX).toFixed(3)});
            }
        }
    };

    svgContainer
        .on("mousemove", function(){
            handleMoveMax.apply(this);
            handleMoveMin.apply(this);
        })
        .on("mouseup", handleLeave)
        .on("mouseleave", handleLeave)
        .on("mousedown", function(){
            const mouseX = (d3.mouse(this))[0];
            const maxBarX = parseInt(maxLine.getAttribute('x1')) + margin.right;
            const minBarX = parseInt(minLine.getAttribute('x1')) + margin.right;

            // Move bar closest to click
            if (Math.abs(mouseX - maxBarX) < Math.abs(mouseX - minBarX)){
                self.maxDown = true;
                maxPosX = parseInt(maxLine.getAttribute('x1')) + margin.right;
                handleMoveMax.apply(this);
            }else{
                self.minDown = true;
                minPosX = parseInt(minLine.getAttribute('x1')) + margin.right;
                handleMoveMin.apply(this);
            }
        });
  }

  
  componentDidMount(){
    this.redraw();
  }
    
  componentDidUpdate(prevProps, prevState){
      if (prevState.min !== this.state.min) this.state.minInput = this.state.min;
      if (prevState.max !== this.state.max) this.state.maxInput = this.state.max;

      if (prevState.min !== this.state.min || 
          prevState.max !== this.state.max ||
          prevProps.colorMap !== this.props.colorMap ||
          prevProps.statistics !== this.props.statistics){

          if (prevProps.statistics !== this.props.statistics) this.reset();
          if (!this.maxDown && !this.minDown) this.redraw();
          this.updateColorMap(prevProps.colorMap !== this.props.colorMap);
          
          if (this.props.onUpdate !== undefined) this.props.onUpdate({min: this.state.min, max: this.state.max});
      }
  }
    
  updateColorMap = (recreate) => {
    if (!this.colorMapElem) return;

    if (recreate){
        this.colorMapElem.select("stop").remove();

        this.props.colorMap.forEach((color, i) => {
            this.colorMapElem.append("stop")
                        .attr('offset', `${(i / (this.props.colorMap.length - 1)) * 100.0}%`)
                        .attr('stop-color', `rgb(${color.join(",")})`);
        });
    }

    const { min, max } = this.state;

    const minPerc = Math.abs(min - this.rangeX[0]) / (this.rangeX[1] - this.rangeX[0]) * 100.0;
    const maxPerc = Math.abs(max - this.rangeX[0]) / (this.rangeX[1] - this.rangeX[0]) * 100.0;

    this.colorMapElem.attr('x1',`${minPerc}%`)
                     .attr('x2', `${maxPerc}%`);
  }
        
  handleChangeMax = (e) => {
    this.setState({maxInput: e.target.value});
    const val = parseFloat(e.target.value);

    if (val >= this.state.min && val <= this.rangeX[1]){
        this.setState({max: val});
    }
  }

  handleChangeMin = (e) => {
    this.setState({minInput: e.target.value});
    const val = parseFloat(e.target.value);

    if (val <= this.state.max && val >= this.rangeX[0]){
        this.setState({min: val});
    }
  }

  render(){
    return (<div className={"histogram " + (this.props.loading ? "disabled" : "")}>
        <div ref={(domNode) => { this.hgContainer = domNode; }}>
        </div>
        <label>{_("Min:")}</label> <input onChange={this.handleChangeMin} type="number" className="form-control min-max" size={5} value={this.state.minInput} />
        <label>{_("Max:")}</label> <input onChange={this.handleChangeMax} type="number" className="form-control min-max" size={5} value={this.state.maxInput} />
    </div>);
  }
}
