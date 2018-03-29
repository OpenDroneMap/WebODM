// Magic to include node_modules of root WebODM's directory
process.env.NODE_PATH = "../../../node_modules";
require("module").Module._initPaths();

let path = require("path");
let webpack = require('webpack');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let LiveReloadPlugin = require('webpack-livereload-plugin');

module.exports = {
  context: __dirname,

  entry: {
    app: ['./app.jsx']
  },

  output: {
      path: path.join(__dirname, './build'),
      filename: "[name].js",
      libraryTarget: "amd"
  },

  plugins: [
    new LiveReloadPlugin(),
    new ExtractTextPlugin('[name].css', {
        allChunks: true
    })
  ],

  module: {
    rules: [
      { 
        test: /\.jsx?$/, 
        exclude: /(node_modules|bower_components)/, 
        use: [
          {
            loader: 'babel-loader',
            query: {
              "plugins": [
                 'syntax-class-properties',
                 'transform-class-properties'
              ],
              presets: ['es2015', 'react']
            }
          }
        ],
      },
      {
        test: /\.s?css$/,
        use: ExtractTextPlugin.extract({
          use: 'css-loader!sass-loader'
        })
      },
      {
        test: /\.(png|jpg|jpeg|svg)/,
        loader: "url-loader?limit=100000"
      }
    ]
  },

  resolve: {
    modules: ['node_modules', 'bower_components'],
    extensions: ['.js', '.jsx']
  },

  externals: {
    // require("jquery") is external and available
    //  on the global let jQuery
    "jquery": "jQuery",
    "SystemJS": "SystemJS",
    "PluginsAPI": "PluginsAPI",
    "leaflet": "leaflet",
    "ReactDOM": "ReactDOM",
    "React": "React"
  }
}