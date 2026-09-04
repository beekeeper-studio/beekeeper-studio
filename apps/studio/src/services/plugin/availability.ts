import type { PluginTabContext, TransportOpenTab } from '@/common/transport/TransportOpenTab';

/** Keep old plugin files and saved data intact while excluding removed features. */
export const excludedPluginIds = ['bks-ai-shell'];

export function isPluginAvailable(pluginId: string | undefined): boolean {
  return !excludedPluginIds.includes(pluginId);
}

/** Ignore persisted plugin tabs without affecting ordinary query or table tabs. */
export function isTabAvailable(tab: TransportOpenTab): boolean {
  return (tab.tabType !== 'plugin-shell' && tab.tabType !== 'plugin-base') ||
    isPluginAvailable((tab.context as Partial<PluginTabContext>)?.pluginId);
}
