const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './src/main.ts'),
  devtool: 'source-map',
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
      minify: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: 'html-loader',
      },
      {
        test: /\.ts$/,
        use: 'ts-loader',
        include: path.resolve(__dirname, './src'),
      },
      {
        test: /\.wav$/,
        use: 'file-loader',
        include: path.resolve(__dirname, './src/assets'),
      },
      {
        test: /\.jpg$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]'
        },
        include: path.resolve(__dirname, './src/assets'),
      },
    ],
  },
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'docs'),
  },
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  mode: 'development'
};
