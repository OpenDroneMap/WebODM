const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/main/index.ts',
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/main'),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

