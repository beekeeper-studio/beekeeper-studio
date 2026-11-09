import { describe, it, expect, vi } from 'vitest'
import pluginMenuFactories, { TOOLBAR_NAME_MAX_LENGTH } from '@/services/plugin/web/PluginMenuFactories'

function createToolbarItem(name: string) {
  const warn = vi.fn()
  const context = {
    manifest: { id: 'p', name: 'P', capabilities: { views: [] } },
    store: { addPopupMenuItem: vi.fn() },
    log: { warn },
  }
  const item = { command: 'explain', name, view: 'v', placement: 'editor.query.toolbar' }
  pluginMenuFactories['editor.query.toolbar'].create(context as any, item as any, {}).add()
  return warn
}

describe('editor.query.toolbar', () => {
  it('warns the plugin developer about a name too long for the toolbar', () => {
    const warn = createToolbarItem('x'.repeat(TOOLBAR_NAME_MAX_LENGTH + 1))
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('explain')
  })

  it('accepts a short name', () => {
    expect(createToolbarItem('Explain')).not.toHaveBeenCalled()
  })
})
