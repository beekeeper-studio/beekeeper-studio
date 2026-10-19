// Built-in items of the Plugins menu section. Kept apart from PopupMenuModule
// so components can use them without importing the store module, which
// would load it before the store does (PopupMenuModule -> BeekeeperPlugin ->
// store is circular).
import type { ContextItem } from "@/plugins/BeekeeperPlugin";
import { AppEvent } from "@/common/AppEvent";

export const PLUGINS_SECTION_LABEL = "Plugins";

export function openPluginManager() {
  // Routed through the main process, like the Tools > Manage Plugins menu item
  window.main.send(AppEvent.menuClick, "managePlugins");
}

export const managePluginsItem: ContextItem = {
  name: "Manage Plugins…",
  slug: "manage-plugins",
  leadingIcon: "extension",
  handler: openPluginManager,
};

/** Shown in place of plugin items when no installed plugin adds any. */
export const noPluginsItem: ContextItem = {
  name: "No plugins…",
  slug: "no-plugins",
  leadingIcon: "extension_off",
  title: "No installed plugin adds an action here",
  disabled: true,
  handler: () => undefined,
};
