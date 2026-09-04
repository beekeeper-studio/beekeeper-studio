import PluginManager from '@/services/plugin/PluginManager';
import PluginRegistry from '@/services/plugin/PluginRegistry';
import { UserSetting } from '@/common/appdb/models/user_setting';
import { TabModule } from '@/store/modules/TabModule';
import Vue from 'vue';

jest.mock('@/common/appdb/models/user_setting', () => ({
  UserSetting: { get: jest.fn(), set: jest.fn() },
}));
jest.mock('@/services/plugin/PluginFileManager', () => jest.fn());
jest.mock('@/services/plugin/PluginRepositoryService', () => jest.fn());
jest.mock('@bksLogger', () => ({
  scope: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

const manifest = (id: string) => ({
  id,
  name: id,
  author: 'test',
  description: 'test plugin',
  version: '1.0.0',
  manifestVersion: 1,
  capabilities: { views: [], menu: [] },
});

describe('Plugins in the minimal build', () => {
  it('omits AI from both registries while retaining other plugins', async () => {
    const service = {
      fetchOfficial: jest.fn().mockResolvedValue([
        { id: 'bks-ai-shell' }, { id: 'bks-er-diagram' },
      ]),
      fetchCommunity: jest.fn().mockResolvedValue([
        { id: 'bks-ai-shell' }, { id: 'custom-plugin' },
      ]),
    };
    const registry = new PluginRegistry(service as any);

    expect(await registry.getEntries()).toEqual({
      official: [{ id: 'bks-er-diagram' }],
      community: [{ id: 'custom-plugin' }],
    });
    await expect(registry.findEntry('bks-ai-shell')).rejects.toThrow('not found');
  });

  it('ignores an existing AI installation and does not check it for updates', async () => {
    (UserSetting.get as jest.Mock).mockResolvedValue({
      value: { 'bks-ai-shell': { autoUpdate: true } },
    });
    const fileManager = {
      scanPlugins: () => [manifest('bks-ai-shell'), manifest('custom-plugin')],
      remove: jest.fn(),
    };
    const registry = {
      findEntry: jest.fn().mockResolvedValue({ origin: 'community' }),
      reloadRepository: jest.fn(),
      getRepository: jest.fn(),
    };
    const manager = new PluginManager({
      appVersion: '5.8.1',
      fileManager: fileManager as any,
      registry: registry as any,
    });
    await manager.initialize();

    expect((await manager.getPlugins()).map((plugin) => plugin.manifest.id))
      .toEqual(['custom-plugin']);
    expect(registry.reloadRepository).not.toHaveBeenCalled();
    expect(fileManager.remove).not.toHaveBeenCalled();
    expect(() => manager.viewEntrypointExists('bks-ai-shell', 'chat'))
      .toThrow('not found');
    await expect(manager.installPlugin('bks-ai-shell'))
      .rejects.toThrow('unavailable in this build');
    expect(registry.getRepository).not.toHaveBeenCalled();
  });

  it('restores query tabs instead of the previously active AI tab', async () => {
    const query = { id: 2, tabType: 'query', active: false, context: {} };
    const ai = {
      id: 1, tabType: 'plugin-shell', active: true,
      context: { pluginId: 'bks-ai-shell' },
    };
    const previousUtil = Vue.prototype.$util;
    const send = jest.fn().mockResolvedValue([ai, query]);
    Vue.prototype.$util = { send };
    const context = {
      rootState: { usedConfig: { id: 10 }, workspaceId: -1 },
      commit: jest.fn(),
    };
    try {
      await (TabModule.actions.load as Function)(context);

      expect(context.commit).toHaveBeenCalledWith('set', [query]);
      expect(context.commit).toHaveBeenCalledWith('setActive', query);
      expect(send).toHaveBeenCalledTimes(1);
      expect(ai.active).toBe(true);
    } finally {
      Vue.prototype.$util = previousUtil;
    }
  });

  it('clears the active tab when a saved session contains only AI tabs', async () => {
    const state = (TabModule.state as Function)();
    state.active = { id: 1 };
    const previousUtil = Vue.prototype.$util;
    Vue.prototype.$util = {
      send: jest.fn().mockResolvedValue([
        { tabType: 'plugin-base', context: { pluginId: 'bks-ai-shell' } },
      ]),
    };
    try {
      await (TabModule.actions.load as Function)({
        rootState: { usedConfig: { id: 10 }, workspaceId: -1 },
        commit: (name, value) => (TabModule.mutations[name] as Function)(state, value),
      });
      expect(state.tabs).toEqual([]);
      expect(state.active).toBeUndefined();
    } finally {
      Vue.prototype.$util = previousUtil;
    }
  });
});
