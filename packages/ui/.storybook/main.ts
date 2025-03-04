import type { StorybookConfig } from '@storybook/react-vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) => {
    config.plugins?.push(
      svgr({
        exportAsDefault: true,
        svgrOptions: {}
      })
    )

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
