const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

/**
 * @type {import('webpack').Configuration[]}
 */
const config = [
  {
    name: 'extension',
    mode: 'production',
    target: 'node',
    entry: {
      extension: './src/extension.ts',
      'websocket-server-process': './src/services/websocket-server-process.ts'
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
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../shared/src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-typescript']
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['../*.vsix'],
        dangerouslyAllowCleanPatternsOutsideProject: true,
        dry: false
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: '../../README.md',
            to: '../README.md'
          }
        ]
      })
    ],
    stats: 'errors-only'
  },
  // Chat webview configuration (browser environment)
  {
    name: 'chat',
    mode: 'production',
    target: 'web',
    entry: {
      chat: './src/chat-view/app.tsx'
    },
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: '[name].js',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    performance: {
      hints: false
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../shared/src'),
        '@ui': path.resolve(__dirname, '../ui/src')
      }
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.scss$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass-embedded'),
                sassOptions: {
                  silenceDeprecations: ['legacy-js-api']
                }
              }
            }
          ]
        },
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  [
                    '@babel/preset-react',
                    {
                      runtime: 'automatic'
                    }
                  ],
                  '@babel/preset-typescript'
                ]
              }
            }
          ]
        }
      ]
    },
    stats: 'errors-only'
  },
  {
    name: 'api',
    mode: 'production',
    target: 'web',
    entry: {
      api: './src/api-view/app.tsx'
    },
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: '[name].js',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    performance: {
      hints: false
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../shared/src'),
        '@ui': path.resolve(__dirname, '../ui/src')
      }
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.scss$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass-embedded'),
                sassOptions: {
                  silenceDeprecations: ['legacy-js-api']
                }
              }
            }
          ]
        },
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  [
                    '@babel/preset-react',
                    {
                      runtime: 'automatic'
                    }
                  ],
                  '@babel/preset-typescript'
                ]
              }
            }
          ]
        }
      ]
    },
    stats: 'errors-only'
  }
]

module.exports = config
