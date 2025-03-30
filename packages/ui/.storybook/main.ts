import type { StorybookConfig } from '@storybook/react-vite'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) => {
    return {
      ...config,
      css: {
        modules: {
          generateScopedName: (name, filename) => {
            const is_module = /\.module\.(scss|css)$/i.test(filename)
            if (is_module) {
              const module_name = path
                .basename(filename)
                .replace(/\.module\.(scss|css)$/i, '')
              return `${module_name}__${name}`
            }
            return name
          }
        }
      },
      resolve: {
        alias: [
          {
            find: '@shared',
            replacement: path.resolve(__dirname, '../../shared/src')
          }
        ]
      }
    }
  }
}

export default config