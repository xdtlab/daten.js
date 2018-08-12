const path = require('path');

module.exports = {
  entry: './src/daten.js',
  output: {
    filename: 'daten.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'daten',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  node: {
    fs: 'empty'
  }
};
