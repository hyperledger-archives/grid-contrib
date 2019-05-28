const path = require('path')
const webpack = require('webpack')

module.exports = {
  mode: 'development',
  entry: './src/main',
  devtool: 'inline-source-map',

  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: 'bundle.js'
  },

  module: {
    rules: [{
      test: /\.(scss)$/,
      use: [{
        loader: 'style-loader'
      }, {
        loader: 'css-loader'
      }, {
        loader: 'postcss-loader',
        options: {
          plugins: () => [
            require('precss'),
            require('autoprefixer')
          ]
        }
      }, {
        loader: 'sass-loader'
      }]
    }]
  },

  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
      Popper: ['popper.js', 'default']
    })
  ],

  devServer: {
    port: 3002,
    contentBase: path.join(__dirname, 'public'),
    publicPath: '/dist/',
    open: true,
    proxy: {
      '/api': 'http://localhost:8022'
    }
  }
}
