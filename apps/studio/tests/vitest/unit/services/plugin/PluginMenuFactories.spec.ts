import { describe, it, expect, vi } from 'vitest'
import pluginMenuFactories from '@/services/plugin/web/PluginMenuFactories'
import { toMenuItem, ContextItem } from '@/plugins/BeekeeperPlugin'
import { AppEvent } from '@/common/AppEvent'

function fakeContext() {
  const items: ContextItem[] = []
  const emit = vi.fn()
  const context = {
    manifest: { id: 'test-plugin' },
    store: {
      addPopupMenuItem: (_menuId: string, item: ContextItem) => items.push(item),
      removePopupMenuItem: vi.fn(),
      appEventBus: { emit },
      buildPluginTabInit: (options: unknown) => options,
    },
  }
  return { context, items, emit }
}

describe('editor.query.context plugin menu', () => {
  it('opens the plugin tab with the editor text, selection and current query', () => {
    const { context, items, emit } = fakeContext()
    const menuItem = {
      command: 'explain',
      name: 'Explain',
      view: 'explain-view',
      placement: 'editor.query.context' as const,
    }
    pluginMenuFactories['editor.query.context']
      .create(context as any, menuItem, {})
      .add()

    // The query editor's context menu (ui-kit) calls handler(event, item),
    // where item is the editor's menu context.
    const editorContext = {
      text: 'SELECT 1;\nSELECT 2;',
      selectedText: '',
      selectedQuery: 'SELECT 2;',
    }
    toMenuItem(items[0]).handler(new MouseEvent('click'), editorContext)

    expect(emit).toHaveBeenCalledWith(AppEvent.newCustomTab, {
      manifest: context.manifest,
      viewId: 'explain-view',
      command: 'explain',
      params: editorContext,
    })
  })
})
