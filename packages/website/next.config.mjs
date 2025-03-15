import nextra from 'nextra'

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true // mandatory, otherwise won't export
  }
}
const withNextra = nextra({
  
})

export default withNextra(nextConfig)
