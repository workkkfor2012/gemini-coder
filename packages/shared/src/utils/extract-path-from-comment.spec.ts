import { extract_path_from_comment } from './extract-path-from-comment'

describe('extract_path_from_comment', () => {
  it('should extract filename from // comment', () => {
    expect(extract_path_from_comment('// path/to/file.ts')).toBe(
      'path/to/file.ts'
    )
  })

  it('should extract filename from // comment', () => {
    expect(extract_path_from_comment('// [path]/(to)/file.ts')).toBe(
      '[path]/(to)/file.ts'
    )
  })

  it('should extract filename from // comment starting with dot', () => {
    expect(extract_path_from_comment('// .gitignore')).toBe('.gitignore')
  })

  it('should extract filename from # comment', () => {
    expect(extract_path_from_comment('# path/to/script.py')).toBe(
      'path/to/script.py'
    )
  })

  it('should extract filename from -- comment', () => {
    expect(extract_path_from_comment('-- path/to/query.sql')).toBe(
      'path/to/query.sql'
    )
  })

  it('should extract filename from * comment line', () => {
    expect(extract_path_from_comment(' * path/to/component.jsx')).toBe(
      'path/to/component.jsx'
    )
  })

  it('should extract filename from /* comment line', () => {
    expect(extract_path_from_comment('/* path/to/styles.css')).toBe(
      'path/to/styles.css'
    )
  })

  it('should extract filename from <!-- comment line', () => {
    expect(extract_path_from_comment('<!-- path/to/template.html')).toBe(
      'path/to/template.html'
    )
  })

  it('should handle leading/trailing spaces', () => {
    expect(extract_path_from_comment('  //   spaced/path/file.go  ')).toBe(
      'spaced/path/file.go'
    )
  })

  it('should extract filename without directory', () => {
    expect(extract_path_from_comment('// simple_file.txt')).toBe(
      'simple_file.txt'
    )
  })

  it('should extract filename with ./ prefix', () => {
    expect(extract_path_from_comment('# ./relative/path.yaml')).toBe(
      './relative/path.yaml'
    )
  })

  it('should extract filename with ../ prefix', () => {
    expect(extract_path_from_comment('// ../parent/dir/file.json')).toBe(
      '../parent/dir/file.json'
    )
  })

  it('should extract only the path when extra text follows', () => {
    expect(
      extract_path_from_comment('// src/main.go and some other text')
    ).toBe('src/main.go')
  })

  it('should extract path containing hyphens and dots', () => {
    expect(extract_path_from_comment('// src/my-component.v1.test.js')).toBe(
      'src/my-component.v1.test.js'
    )
  })

  it('should return null if no valid path is found', () => {
    expect(extract_path_from_comment('// This is just a comment')).toBe(null)
  })

  it('should return null if no extension is present', () => {
    expect(extract_path_from_comment('// path/to/file_without_extension')).toBe(
      null
    )
  })

  it('should return null for empty comment', () => {
    expect(extract_path_from_comment('//')).toBe(null)
    expect(extract_path_from_comment('# ')).toBe(null)
  })

  it('should return null for whitespace only comment', () => {
    expect(extract_path_from_comment('//    ')).toBe(null)
  })

  it('should return null for non-comment line starting with path', () => {
    // The function expects the line to start with a comment marker to strip
    expect(extract_path_from_comment('path/to/file.ts')).toBe(null)
  })

  it('should return null for empty string', () => {
    expect(extract_path_from_comment('')).toBe(null)
  })

  it('should return null for just whitespace string', () => {
    expect(extract_path_from_comment('   ')).toBe(null)
  })
})
