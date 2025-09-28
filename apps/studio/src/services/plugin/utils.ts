import { Manifest, ManifestV0, PluginMenuItem, PluginView } from "./types";
import _ from "lodash";

export function mapViewsAndMenuFromV0ToV1(manifest: ManifestV0): {
  views: PluginView[];
  menu: PluginMenuItem[];
} {
  const views = manifest.capabilities.views.tabTypes?.map<PluginView>(
    (tabType) => ({
      id: tabType.id,
      name: tabType.name,
      type: tabType.kind.includes("shell") ? "shell-tab" : "base-tab",
      entry: tabType.entry,
    })
  );
  let menu: PluginMenuItem[] = [];
  if (_.isArray(manifest.capabilities.menu) && manifest.capabilities.menu.length > 0) {
    menu = manifest.capabilities.menu;
  } else {
    menu = views.map((view) => ({
      command: `${view.id}-new-tab-dropdown`,
      name: `New ${manifest.name}`,
      view: view.id,
      placement: "newTabDropdown",
    }));
  }
  return { views, menu };
}

export function isManifestV0(m: Manifest): m is ManifestV0 {
  return m.manifestVersion === undefined || m.manifestVersion === 0;
}

