import { check_for_diff_markers } from './check-for-diff-markers'

describe('check_for_diff_markers', () => {
  it('should return true for lines starting with +', () => {
    expect(check_for_diff_markers('+ added line')).toBe(true)
  })

  it('should return true for lines starting with -', () => {
    expect(check_for_diff_markers('- removed line')).toBe(true)
  })

  it('should return false for lines not starting with + or -', () => {
    expect(check_for_diff_markers(' regular line')).toBe(false)
  })

  //   it('should return true if any line in multiline text starts with + or -', () => {
  //     const text = `normal line
  // + added line
  // another normal line
  // - removed line`
  //     expect(check_for_diff_markers(text)).toBe(true)
  //   })

  it('should return false if no lines start with + or -', () => {
    const text = `normal line
another normal line
  indented line`
    expect(check_for_diff_markers(text)).toBe(false)
  })

  it('should handle empty string', () => {
    expect(check_for_diff_markers('')).toBe(false)
  })
})
