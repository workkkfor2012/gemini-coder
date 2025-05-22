import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Code Web Chat',
  tagline:
    'Copy selected folders and files for web chats or initialize them hands-free! Use the same context with your favorite models for quality code completions and file refactorings.',
  favicon: 'img/favicon.ico',
  url: 'https://codeweb.chat/',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/robertpiosik/CodeWebChat/tree/master/packages/website/'
        },
        blog: {
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn'
        },
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Code Web Chat',
      logo: {
        alt: 'Code Web Chat',
        src: 'img/logo.svg'
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'documentationSidebar',
          position: 'left',
          label: 'Documentation'
        },
        // {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/robertpiosik/CodeWebChat',
          label: 'GitHub',
          position: 'right'
        },
        {
          href: 'https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder',
          label: 'Install Extension',
          position: 'right'
        },
        {
          href: 'https://buymeacoffee.com/robertpiosik',
          label: 'Buy me a coffee',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      // links: [
      //   {
      //     title: 'Docs',
      //     items: [
      //       {
      //         label: 'Tutorial',
      //         to: '/docs/intro',
      //       },
      //     ],
      //   },
      //   {
      //     title: 'Community',
      //     items: [
      //       {
      //         label: 'Stack Overflow',
      //         href: 'https://stackoverflow.com/questions/tagged/docusaurus',
      //       },
      //       {
      //         label: 'Discord',
      //         href: 'https://discordapp.com/invite/docusaurus',
      //       },
      //       {
      //         label: 'X',
      //         href: 'https://x.com/robert',
      //       },
      //     ],
      //   },
      //   {
      //     title: 'More',
      //     items: [
      //       // {
      //       //   label: 'Blog',
      //       //   to: '/blog',
      //       // },
      //       {
      //         label: 'GitHub',
      //         href: 'https://github.com/facebook/docusaurus',
      //       },
      //     ],
      //   },
      // ],
      copyright: `Copyright © ${new Date().getFullYear()}-present Robert Piosik. GPL-3.0 license.`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula
    }
  } satisfies Preset.ThemeConfig
}

export default config
