const path = require('path');
const fs = require('fs');
const TerserPlugin = require('terser-webpack-plugin');

class CopyCssPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('CopyCssPlugin', (compilation, callback) => {
      const css = fs.readFileSync(path.join(__dirname, 'src/styles.css'), 'utf8');
      compilation.assets['chatbot.css'] = {
        source: () => css,
        size: () => css.length,
      };
      callback();
    });
  }
}

module.exports = {
  mode: 'production',
  entry: './src/chatbot.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'chatbot.min.js',
    library: 'ChatbotWidget',
    libraryTarget: 'umd',
    libraryExport: 'default',
    globalObject: 'this',
    publicPath: 'auto',
    clean: { keep: /demo\.html$/ },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        type: 'asset/source',
      },
    ],
  },
  plugins: [new CopyCssPlugin()],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
    splitChunks: false,
    runtimeChunk: false,
  },
};
