const fs = require('fs')
const path = require('path')

// Read the original manifest.json
const manifest_path = path.join(__dirname, 'src', 'manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf8'))

// Change manifest version
const firefox_manifest = { ...manifest }
delete firefox_manifest.manifest_version
firefox_manifest.manifest_version = 2

// Create dist-firefox directory if it doesn't exist
const firefox_dist_dir = path.join(__dirname, 'dist-firefox')
if (!fs.existsSync(firefox_dist_dir)) {
  fs.mkdirSync(firefox_dist_dir)
}

// Copy the contents of the dist directory to dist-firefox
const dist_dir = path.join(__dirname, 'dist')
fs.cpSync(dist_dir, firefox_dist_dir, { recursive: true })

// Write the modified manifest to manifest.json in dist-firefox
const firefox_manifest_path = path.join(
  __dirname,
  'dist-firefox',
  'manifest.json'
)
fs.writeFileSync(
  firefox_manifest_path,
  JSON.stringify(firefox_manifest, null, 2)
)

console.log('Firefox manifest created successfully.')
