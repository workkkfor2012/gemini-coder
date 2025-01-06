const path = require('path')

/**@type {import('webpack').Configuration}*/
const config = {
  mode: 'production',
  target: 'node', // Main extension target
  entry: {
    extension: './src/extension.ts', // Main extension entry point
    chat: './src/chat-view/chat.ts' // Webview script entry point
  },
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
}

module.exports = config
