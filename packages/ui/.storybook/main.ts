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
