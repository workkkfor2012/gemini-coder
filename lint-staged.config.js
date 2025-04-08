module.exports = {
  'src/**/*.{ts,tsx}': [
    'pnpm --filter gemini-coder lint -- --max-warnings=0'
  ]
}