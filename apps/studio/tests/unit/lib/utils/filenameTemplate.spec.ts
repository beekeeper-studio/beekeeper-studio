import {
  resolveFilenameTemplate,
  sanitizeFilename,
  DEFAULT_FILENAME_TEMPLATE,
} from '@/lib/utils/filenameTemplate'

const date = new Date(2026, 6, 31, 19, 46, 5)

describe('resolveFilenameTemplate', () => {
  it('replaces all variables with their values', () => {
    expect(resolveFilenameTemplate('{YYYY}-{MM}-{DD}_{HH}{mm}{SS}', 'sandbox', date)).toBe('2026-07-31_194605')
  })

  it('matches the issue example {dbname}_{YYYY}{MM}{DD}_{HH}{mm}', () => {
    expect(resolveFilenameTemplate('{dbname}_{YYYY}{MM}{DD}_{HH}{mm}', 'sandbox', date)).toBe('sandbox_20260731_1946')
  })

  it('replaces repeated variables', () => {
    expect(resolveFilenameTemplate('{dbname}-{dbname}', 'sandbox', date)).toBe('sandbox-sandbox')
  })

  it('mixes variables with arbitrary static text', () => {
    expect(resolveFilenameTemplate('backup_{dbname}_{YYYY}-{MM}-{DD}', 'sandbox', date)).toBe('backup_sandbox_2026-07-31')
  })

  it('resolves the default template to the legacy default name', () => {
    expect(resolveFilenameTemplate(DEFAULT_FILENAME_TEMPLATE, 'sandbox', date)).toBe('2026-07-31_194605')
  })

  it('keeps unknown placeholders unchanged', () => {
    expect(resolveFilenameTemplate('backup_{unknown}_x', 'sandbox', date)).toBe('backup_{unknown}_x')
  })

  it('sanitizes invalid filename characters', () => {
    expect(resolveFilenameTemplate('a/b\\c:d*e?f"g<h>i|j', 'sandbox', date)).toBe('a_b_c_d_e_f_g_h_i_j')
  })

  it('sanitizes database names containing invalid characters', () => {
    expect(resolveFilenameTemplate('{dbname}', 'my/db:name', date)).toBe('my_db_name')
  })

  it('returns the legacy default name for an empty template', () => {
    expect(resolveFilenameTemplate('', 'sandbox', date)).toBe('2026-07-31_194605')
    expect(resolveFilenameTemplate('   ', 'sandbox', date)).toBe('2026-07-31_194605')
    expect(resolveFilenameTemplate(null as any, 'sandbox', date)).toBe('2026-07-31_194605')
    expect(resolveFilenameTemplate(undefined as any, 'sandbox', date)).toBe('2026-07-31_194605')
  })
})

describe('sanitizeFilename', () => {
  it('replaces every invalid character with an underscore', () => {
    expect(sanitizeFilename('a\\/:*?"<>|b')).toBe('a_________b')
  })

  it('leaves valid characters unchanged', () => {
    expect(sanitizeFilename('sandbox_2026-07-31')).toBe('sandbox_2026-07-31')
  })
})
