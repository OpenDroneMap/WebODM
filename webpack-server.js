let webpack = require('webpack');
let WebpackDevServer = require('webpack-dev-server');
let config = require('./webpack.config');
//ajax code
new WebpackDevServer(webpack(config), {
  publicPath: config.output.publicPath,
  hot: true,
  inline: true
}).listen(3000, '0.0.0.0', (err, result) => {
  if (err) {
    console.log(err);
  }

  console.log('Listening at 0.0.0.0:3000');
})
