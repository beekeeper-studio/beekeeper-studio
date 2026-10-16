import { describe, it, expect, vi } from 'vitest'
import pluginMenuFactories from '@/services/plugin/web/PluginMenuFactories'
import { mapViewsAndMenuFromV0ToV1 } from '@/services/plugin/utils'
import aiShell from '@beekeeperstudio/bks-ai-shell/manifest.json'
import erDiagram from '@beekeeperstudio/bks-er-diagram/manifest.json'

// The bundled plugins ship separately from the app, so the menus they
// declare must keep working: same menu ids and slugs, same params.

const fakeItems: Record<string, unknown> = {
  'entity.table': { schema: 'public', name: 'orders', entityType: 'table' },
  'entity.schema': 'public',
  'structure.statusbar': { schema: 'public', name: 'orders', entityType: 'view' },
}

/** Register a manifest's menu items, pick each popup item, and record what
 * the app was asked to show and open. */
function record(manifest: any) {
  const out: any[] = []
  const handlers: [string, (args: unknown) => void][] = []
  const store = {
    addPopupMenuItem: (menuId: string, item: any) => {
      out.push({ popup: menuId, slug: item.slug, name: item.name })
      handlers.push([menuId, item.handler])
    },
    setTabDropdownItem: (o: any) => out.push({ dropdown: o.menuItem.name, command: o.menuItem.command, view: o.menuItem.view }),
    addMenuBarItem: (item: any) => out.push({ menubar: item.id, label: item.label }),
    appEventBus: { emit: (_event: string, init: any) => out.push({ open: init }) },
    buildPluginTabInit: (o: any) => ({ viewId: o.viewId, command: o.command, params: o.params }),
  }
  const m = manifest.manifestVersion === 0
    ? { ...manifest, capabilities: { ...manifest.capabilities, ...mapViewsAndMenuFromV0ToV1(manifest) } }
    : manifest
  vi.stubGlobal('main', { addNativeMenuItem: vi.fn() })
  try {
    for (const menuItem of m.capabilities.menu) {
      const placements = Array.isArray(menuItem.placement) ? menuItem.placement : [menuItem.placement]
      for (const placement of placements) {
        pluginMenuFactories[placement].create({ manifest: m, store } as any, menuItem, {}).add()
      }
    }
  } finally {
    vi.unstubAllGlobals()
  }
  handlers.forEach(([menuId, handler]) => handler({ item: fakeItems[menuId], event: {}, option: {} }))
  return out
}

describe('bundled plugin menus', () => {
  it('AI Shell', () => {
    expect(record(aiShell)).toEqual([
      { dropdown: 'Add AI Shell', command: 'new-tab-dropdown-item', view: 'bks-ai-shell' },
    ])
  })

  it('ER Diagram', () => {
    expect(record(erDiagram)).toEqual([
      { menubar: 'bks-er-diagram-showAllEntities', label: 'Open ER Diagram' },
      { popup: 'entity.schema', slug: 'bks-er-diagram-showOneSchema', name: 'View ERD' },
      { popup: 'entity.table', slug: 'bks-er-diagram-showOneTable', name: 'View ERD' },
      { popup: 'structure.statusbar', slug: 'bks-er-diagram-showOneTable', name: 'View ERD' },
      { open: { viewId: 'main-view', command: 'showOneSchema', params: { entity: { type: 'schema', name: 'public' } } } },
      { open: { viewId: 'main-view', command: 'showOneTable', params: { entity: { type: 'table', schema: 'public', name: 'orders' } } } },
      { open: { viewId: 'main-view', command: 'showOneTable', params: { entity: { type: 'view', name: 'orders', schema: 'public' } } } },
    ])
  })
})
