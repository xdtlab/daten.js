const path = require('path');

module.exports = {
  entry: './src/daten.js',
  output: {
    filename: 'daten.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'daten',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  node: {
    fs: 'empty'
  }
};
