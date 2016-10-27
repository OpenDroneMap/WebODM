let path = require("path");
let webpack = require('webpack');
let BundleTracker = require('webpack-bundle-tracker');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let LiveReloadPlugin = require('webpack-livereload-plugin');

module.exports = {
  context: __dirname,

  entry: [
    // 'webpack-dev-server/client?http://localhost:3000',
    // 'webpack/hot/only-dev-server',
    './app/static/app/js/main.jsx',
  ],

  output: {
      path: path.join(__dirname, './app/static/app/bundles/'),
      filename: "[name]-[hash].js"
      // publicPath: 'http://localhost:3000/app/static/app/bundles/', // Tell django to use this URL to load packages and not use STATIC_URL + bundle_name
  },

  plugins: [
    // new webpack.HotModuleReplacementPlugin(),
    // new webpack.NoErrorsPlugin(), // don't reload if there is an error
    new LiveReloadPlugin(),
    new BundleTracker({filename: './webpack-stats.json'}),
    new ExtractTextPlugin('css/main.css', {
        allChunks: true
    })
  ],

  module: {
    loaders: [
      { 
        test: /\.jsx?$/, 
        exclude: /(node_modules|bower_components)/, 
        loader: 'babel-loader',
        query: {
          // plugins: ['react-hot-loader/babel'],
          presets: ['es2015', 'react']
        }
      },
      {
        test: /\.s?css$/,
        loader: ExtractTextPlugin.extract('css!sass')
      }
    ]
  },

  resolve: {
    modulesDirectories: ['node_modules', 'bower_components'],
    extensions: ['', '.js', '.jsx']
  },

  externals: {
        // require("jquery") is external and available
        //  on the global let jQuery
    "jquery": "jQuery"
  }
}