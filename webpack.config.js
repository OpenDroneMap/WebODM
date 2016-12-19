let path = require("path");
let webpack = require('webpack');
let BundleTracker = require('webpack-bundle-tracker');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let LiveReloadPlugin = require('webpack-livereload-plugin');

let osgPath = path.resolve('app/static/app/js/vendor/osgjs');

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
          "plugins": [
             'syntax-class-properties',
             'transform-class-properties'
             // 'react-hot-loader/babel'
          ],
          presets: ['es2015', 'react']
        }
      },
      {
        test: /\.s?css$/,
        loader: ExtractTextPlugin.extract('css!sass')
      },
      {
        test: /\.(png|jpg|jpeg|svg)/,
        loader: "url-loader?limit=100000"
      },
      {
        // shaders
        test: /\.(frag|vert|glsl)$/,
        loader: 'raw-loader'
      }
    ]
  },

  resolve: {
    modulesDirectories: ['node_modules', 'bower_components'],
    extensions: ['', '.js', '.jsx'],

    alias: {
      osg: path.join(osgPath, 'osg'),
      osgNameSpace: path.join(osgPath, 'osgNameSpace.js'),
      osgAnimation: path.join(osgPath, 'osgAnimation'),
      osgDB: path.join(osgPath, 'osgDB'),
      osgGA: path.join(osgPath, 'osgGA'),
      osgPlugins: path.join(osgPath, 'osgPlugins'),
      osgShader: path.join(osgPath, 'osgShader'),
      osgShadow: path.join(osgPath, 'osgShadow'),
      osgText: path.join(osgPath, 'osgText'),
      osgUtil: path.join(osgPath, 'osgUtil'),
      osgViewer: path.join(osgPath, 'osgViewer'),
      osgWrappers: path.join(osgPath, 'osgWrappers')      
    }
  },

  externals: {
    // require("jquery") is external and available
    //  on the global let jQuery
    "jquery": "jQuery",
    "zlib" : "Zlib",
    "bluebird": "P",
    "rstats": "rStats",
    "hammer": "Hammer"
  }
}