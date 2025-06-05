const fs = require('fs')
const path = require('path')

const header = `---
sidebar_position: 1
title: Intro
hide_title: true
custom_edit_url: https://github.com/robertpiosik/CodeWebChat/blob/dev/README.md
---

`

const readme_path = path.join(__dirname, '../../README.md')
const docs_index_path = path.join(__dirname, '../../docs/index.md')

function copy_readme() {
  try {
    const readme_content = fs.readFileSync(readme_path, 'utf8')
    const final_content = header + readme_content

    const docs_dir = path.dirname(docs_index_path)
    if (!fs.existsSync(docs_dir)) {
      fs.mkdirSync(docs_dir, { recursive: true })
    }

    fs.writeFileSync(docs_index_path, final_content)
    console.log('✅ README.md copied to docs/index.md with header')
  } catch (error) {
    console.error('❌ Error copying README:', error.message)
    process.exit(1)
  }
}

function watch_readme() {
  console.log('👀 Watching README.md for changes...')

  copy_readme()

  fs.watchFile(readme_path, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
      console.log('📝 README.md changed, copying...')
      copy_readme()
    }
  })
}

if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.includes('--watch')) {
    watch_readme()
  } else {
    copy_readme()
  }
}

module.exports = { copy_readme, watch_readme }
