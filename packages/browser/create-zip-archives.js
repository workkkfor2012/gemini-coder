const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

function get_version() {
  const manifest_path = path.join(__dirname, 'src', 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf8'))
  return manifest.version
}

function create_zip_from_directory(source_dir, output_path) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(output_path)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(source_dir, false)
    archive.finalize()
  })
}

async function main() {
  const base_dir = __dirname
  const dist_dir = path.join(base_dir, 'dist')
  const firefox_dist_dir = path.join(base_dir, 'dist-firefox')
  const version = get_version()

  try {
    await create_zip_from_directory(
      dist_dir,
      path.join(base_dir, `extension-chrome-${version}.zip`)
    )

    await create_zip_from_directory(
      firefox_dist_dir,
      path.join(base_dir, `extension-firefox-${version}.zip`)
    )
  } catch (error) {
    console.error('Error creating ZIP archives:', error)
    process.exit(1)
  }
}

main()
