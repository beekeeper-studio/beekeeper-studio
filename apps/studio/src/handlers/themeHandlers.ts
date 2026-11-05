import { state } from '@/handlers/handlerState';
import platformInfo from '@/common/platform_info';
import ExtensionFileManager from '@/services/extensions/ExtensionFileManager';
import { ThemeManager } from '@/services/theme/ThemeManager';
import { ThemeConfigurationModule } from '@/services/theme/modules/ThemeConfigurationModule';
import { ThemeAutoUpdateModule } from '@/services/theme/modules/ThemeAutoUpdateModule';
import BksConfig from '@/common/bksConfig';
import { ExtensionRepository, RegistryMap, ThemeManifest, ThemeSnapshot } from '@/services/plugin/types';

export const themeManager = new ThemeManager({
  fileManager: new ExtensionFileManager({ root: platformInfo.themesDirectory }),
});
themeManager.registerModule(ThemeConfigurationModule.with({ config: BksConfig }));
themeManager.registerModule(ThemeAutoUpdateModule.with({ config: BksConfig }));

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
    return await themeManager.getThemes();
  },
  'theme/watch': async function({ sId }: { sId: string }) {
    themeManager.watch(sId, (id) => {
      state(sId).port.postMessage({ type: 'themeFileChanged', input: id });
    });
  },
  'theme/checkForUpdates': async function({ id }: { id: string }) {
    return await themeManager.checkForUpdates(id);
  },
  'theme/install': async function({ id }: { id: string }) {
    return await themeManager.installTheme(id);
  },
  'theme/entries': async function({ clearCache }: { clearCache: boolean }) {
    if (clearCache) {
      themeManager.registry.clearCache();
    }
    const entries = await themeManager.registry.getEntries();
    return { entries, errors: Object.values(themeManager.registry.errors) };
  },
  'theme/repository': async function({ id }: { id: string }) {
    return await themeManager.registry.getRepository(id);
  },
  'theme/uninstall': async function({ id }: { id: string }) {
    await themeManager.uninstallTheme(id);
  }
};
