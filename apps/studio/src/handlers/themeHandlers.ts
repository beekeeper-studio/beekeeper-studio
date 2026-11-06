import { context } from '@/handlers/handlerContext';
import { state } from '@/handlers/handlerState';
import { ExtensionRepository, RegistryMap, ThemeManifest, ThemeSnapshot } from '@/services/plugin/types';

export interface IThemeHandlers {
  'theme/themes': () => Promise<ThemeSnapshot[]>,
  'theme/watch': ({ sId }: { sId: string }) => Promise<void>
  'theme/checkForUpdates': ({ id }: { id: string }) => Promise<boolean>
  'theme/install': ({ id }: { id: string }) => Promise<ThemeManifest>
  'theme/entries': ({ clearCache }: { clearCache: boolean }) => Promise<{ entries: RegistryMap, errors: string[] }>
  'theme/repository': ({ id }: { id: string }) => Promise<ExtensionRepository>
  'theme/uninstall': ({ id }: { id: string }) => Promise<void>
}

export const ThemeHandlers: IThemeHandlers = {
  'theme/themes': async function() {
    return await context.themeManager.getThemes();
  },
  'theme/watch': async function({ sId }: { sId: string }) {
    context.themeManager.watch(sId, (id) => {
      state(sId).port.postMessage({ type: 'themeFileChanged', input: id });
    });
  },
  'theme/checkForUpdates': async function({ id }: { id: string }) {
    return await context.themeManager.checkForUpdates(id);
  },
  'theme/install': async function({ id }: { id: string }) {
    return await context.themeManager.installTheme(id);
  },
  'theme/entries': async function({ clearCache }: { clearCache: boolean }) {
    if (clearCache) {
      context.themeManager.registry.clearCache();
    }
    const entries = await context.themeManager.registry.getEntries();
    return { entries, errors: Object.values(context.themeManager.registry.errors) };
  },
  'theme/repository': async function({ id }: { id: string }) {
    return await context.themeManager.registry.getRepository(id);
  },
  'theme/uninstall': async function({ id }: { id: string }) {
    await context.themeManager.uninstallTheme(id);
  }
};
