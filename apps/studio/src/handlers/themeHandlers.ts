import { context } from '@/handlers/handlerContext';
import { ExtensionRegistryError } from '@/lib/errors';
import { ExtensionRepository, RegistryMap, ThemeManifest, ThemeSnapshot } from '@/services/plugin/types';

export interface IThemeHandlers {
  'theme/themes': () => Promise<ThemeSnapshot[]>,
  'theme/watch': ({ themeId }: { themeId: string }) => Promise<void>
  'theme/checkForUpdates': ({ id }: { id: string }) => Promise<boolean>
  'theme/install': ({ id }: { id: string }) => Promise<ThemeManifest>
  'theme/update': ({ id }: { id: string }) => Promise<ThemeManifest>
  'theme/entries': ({ clearCache }: { clearCache: boolean }) => Promise<{ entries: RegistryMap, errors: string[] }>
  'theme/uninstall': ({ id }: { id: string }) => Promise<void>
  'theme/repository': ({ id }: { id: string }) => Promise<Partial<ExtensionRepository>>
}

export const ThemeHandlers: IThemeHandlers = {
  'theme/themes': async function() {
    return await context.themeManager.getThemes();
  },
  'theme/watch': async function({ themeId }: { themeId: string }) {
    context.themeManager.watch(themeId);
  },
  'theme/checkForUpdates': async function({ id }: { id: string }) {
    return await context.themeManager.checkForUpdates(id);
  },
  'theme/install': async function({ id }: { id: string }) {
    return await context.themeManager.installTheme(id);
  },
  'theme/update': async function({ id }: { id: string }) {
    return await context.themeManager.updateTheme(id);
  },
  'theme/entries': async function({ clearCache }: { clearCache: boolean }) {
    if (clearCache) {
      context.themeManager.registry.clearCache();
    }
    const entries = await context.themeManager.registry.getEntries();
    return { entries, errors: Object.values(context.themeManager.registry.errors) };
  },
  'theme/uninstall': async function({ id }: { id: string }) {
    await context.themeManager.uninstallTheme(id);
  },
  'theme/repository': async function({ id }: { id: string }) {
    try {
      return await context.themeManager.registry.getRepository(id);
    } catch (e) {
      if (!(e instanceof ExtensionRegistryError && e.code === 'ENTRY_NOT_FOUND')) {
        throw e;
      }
      const themes = await context.themeManager.getThemes();
      const theme = themes.find(({ manifest }) => manifest.id === id);
      if (!theme) {
        throw e;
      }
      try {
        return { readme: await context.themeManager.getThemeAsset(theme.manifest, 'README.md') };
      } catch {
        // A theme without a readme is still reported as missing from the registry.
        throw e;
      }
    }
  }
};
