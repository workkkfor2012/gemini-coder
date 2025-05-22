const fs = require('fs')
const path = require('path')

const header = `---
sidebar_position: 1
title: Intro
hide_title: true
---

`

const readmePath = path.join(__dirname, '../../../README.md')
const docsIndexPath = path.join(__dirname, '../docs/index.md')

try {
  const readmeContent = fs.readFileSync(readmePath, 'utf8')
  const finalContent = header + readmeContent

  // Ensure docs directory exists
  const docsDir = path.dirname(docsIndexPath)
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
  }

  fs.writeFileSync(docsIndexPath, finalContent)
  console.log('✅ README.md copied to docs/index.md with header')
} catch (error) {
  console.error('❌ Error copying README:', error.message)
  process.exit(1)
}
