// The popup menus plugins add to, and the built-in items of their Plugins
// section. Kept apart from PopupMenuModule so components can use them without
// importing the store module, which would load it before the store does
// (PopupMenuModule -> BeekeeperPlugin -> store is circular).
import type { ContextItem } from "@/plugins/BeekeeperPlugin";
import ClientMenuActionHandler from "@/lib/menu/ClientMenuActionHandler";
import type { PluginMenuItemPlacement } from "@/services/plugin/types";

/** The popup menu each popup placement adds its items to. */
export const PLUGIN_POPUP_MENUS = {
  "editor.query.context": "editor.query",
  "editor.query.toolbar": "editor.query.toolbar",
  "results.cell.context": "results.cell",
  "results.columnHeader.context": "results.columnHeader",
  "results.rowHeader.context": "results.rowHeader",
  "results.corner.context": "results.corner",
  "results.statusbar": "results.statusbar",
  "tableTable.cell.context": "tableTable.cell",
  "tableTable.columnHeader.context": "tableTable.columnHeader",
  "tableTable.rowHeader.context": "tableTable.rowHeader",
  "tableTable.corner.context": "tableTable.corner",
  "tableTable.statusbar": "tableTable.statusbar",
  "tab.query.header.context": "tab.query.header",
  "tab.table.header.context": "tab.table.header",
  "entity.table.context": "entity.table",
  "entity.schema.context": "entity.schema",
  "entity.routine.context": "entity.routine",
  "structure.statusbar.menu": "structure.statusbar",
} as const satisfies Record<Exclude<PluginMenuItemPlacement, "newTabDropdown" | "menubar.tools">, string>;

export type PluginPopupPlacement = keyof typeof PLUGIN_POPUP_MENUS;

/**
 * Popup menus that plugin placements can add items to. These always end with
 * the Plugins section, even when no plugin adds anything, so plugin actions
 * stay discoverable. Other menus get no section.
 */
export const PLUGIN_MENU_IDS: ReadonlySet<string> = new Set(Object.values(PLUGIN_POPUP_MENUS));

export const PLUGINS_SECTION_LABEL = "Plugins";

const menuActions = new ClientMenuActionHandler();

/** Opens the Plugin Manager the way Tools > Manage Plugins does. */
export const openPluginManager = menuActions.managePlugins;

export const managePluginsItem: ContextItem = {
  name: "Manage Plugins…",
  slug: "manage-plugins",
  leadingIcon: "open_in_new",
  handler: () => openPluginManager(),
};

/** Shown in place of plugin items when no installed plugin adds any. */
export const noPluginsItem: ContextItem = {
  name: "No Plugins…",
  slug: "no-plugins",
  leadingIcon: "extension_off",
  title: "No installed plugin adds an action here",
  disabled: true,
  handler: () => undefined,
};
