import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'

import '../styles.css'
import 'nextra-theme-docs/style.css'

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
}

const navbar = (
  <Navbar
    logo={<b>Gemini Coder</b>}
    projectLink="https://github.com/robertpiosik/gemini-coder"
  />
)
const footer = (
  <Footer>Copyright © {new Date().getFullYear()}, <a href="https://buymeacoffee.com/robertpiosik" target="_blank">Robert Piosik</a>.</Footer>
)

export default async function RootLayout({ children }) {
  const page_map = await getPageMap()

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Layout
          navbar={navbar}
          sidebar={{
            toggleButton: false
          }}
          pageMap={page_map}
          docsRepositoryBase="https://github.com/robertpiosik/gemini-coder/tree/master/packages/docs"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
