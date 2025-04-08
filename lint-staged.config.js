module.exports = {
  'packages/vscode/src/**/*.{ts,tsx}': [
    'pnpm --filter gemini-coder lint -- --max-warnings=0'
  ]
}
