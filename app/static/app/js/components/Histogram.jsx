import React from 'react';
import PropTypes from 'prop-types';
import '../css/Histogram.scss';
import d3 from 'd3';

export default class Histogram extends React.Component {
  static defaultProps = {
      width: 280,
      colorMap: null
  };
  static propTypes = {
      statistics: PropTypes.object.isRequired,
      colorMap: PropTypes.array,
      width: PropTypes.number
  }

  constructor(props){
    super(props);

    this.state = {};
  }

  componentDidMount(){
    let margin = {top: 5, right: 5, bottom: 30, left: 5},
        width = this.props.width - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    let svg = d3.select(this.hgContainer)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

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

    console.log(minX, maxX, minY, maxY);

    // add the x Axis
    let x = d3.scale.linear()
                .domain([minX, maxX])
                .range([0, width]);

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.svg.axis().scale(x).orient("bottom"));
    
    // add the y Axis
    let y = d3.scale.linear()
            .domain([minY, maxY])
            .range([height, 0]);

    for (let i in this.props.statistics){
        const band = this.props.statistics[i];
        const data = band.histogram[0].map((e, i) => {
            return [band.histogram[1][i], e];
        });

        // Plot the area
        let curve = svg
            .append('g')
            .append("path")
            .attr("class", "mypath")
            .datum(data)
            .attr("fill", "#69b3a2")
            .attr("opacity", ".8")
            .attr("stroke", "#000")
            .attr("stroke-width", 0)
            .attr("d",  d3.svg.line()
                .x(function(d) { return x(d[0]); })
                .y(function(d) { return y(d[1]); })
            );
    }
    
  }

  render(){
    return (<div className="histogram">
        <div ref={(domNode) => { this.hgContainer = domNode; }}>
        </div>
    </div>);
  }
}







  // Compute kernel density estimation
//   var kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40))
//   var density =  kde( data.map(function(d){  return d.price; }) )



//   // A function that update the chart when slider is moved?
//   function updateChart(binNumber) {
//     // recompute density estimation
//     kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(binNumber))
//     density =  kde( data.map(function(d){  return d.price; }) )
//     console.log(binNumber)
//     console.log(density)

//     // update the chart
//     curve
//       .datum(density)
//       .transition()
//       .duration(1000)
//       .attr("d",  d3.line()
//         .curve(d3.curveLinear)
//           .x(function(d) { return x(d[0]); })
//           .y(function(d) { return y(d[1]); })
//       );
//   }

//   // Listen to the slider?
//   d3.select("#mySlider").on("change", function(d){
//     selectedValue = this.value
//     updateChart(selectedValue)
//   })

// });


// // Function to compute density
// function kernelDensityEstimator(kernel, X) {
//   return function(V) {
//     return X.map(function(x) {
//       return [x, d3.mean(V, function(v) { return kernel(x - v); })];
//     });
//   };
// }
// function kernelEpanechnikov(k) {
//   return function(v) {
//     return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
//   };
// }