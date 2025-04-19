import { check_for_truncated_fragments } from './check-for-truncated-fragments'

describe('check_for_truncated_fragments', () => {
  it('should return true for // ... comment', () => {
    expect(check_for_truncated_fragments('// ...')).toBe(true)
  })

  it('should return false for //... (no space)', () => {
    expect(check_for_truncated_fragments('//...')).toBe(false)
  })

  it('should return true for // ... with whitespace', () => {
    expect(check_for_truncated_fragments('  // ...  ')).toBe(true)
  })

  it('should return true for // ... with text', () => {
    expect(check_for_truncated_fragments('  // ... abc')).toBe(true)
  })

  it('should return false for regular comments', () => {
    expect(check_for_truncated_fragments('// regular comment')).toBe(false)
  })

  it('should return true if any line in multiline text matches', () => {
    const text = `some code
// ...
more code`
    expect(check_for_truncated_fragments(text)).toBe(true)
  })

  it('should return false if no lines match', () => {
    const text = `some code
// regular comment
more code`
    expect(check_for_truncated_fragments(text)).toBe(false)
  })

  it('should handle empty string', () => {
    expect(check_for_truncated_fragments('')).toBe(false)
  })

  it('should match with different comment styles', () => {
    expect(check_for_truncated_fragments('# ...')).toBe(true)
    expect(check_for_truncated_fragments('-- ...')).toBe(true)
    expect(check_for_truncated_fragments('/* ... */')).toBe(true)
  })
})
