import globals from '@/common/globals';
import { state, themeManager } from '@/handlers/handlerState';

export interface IThemeHandlers {
  'theme/list': () => Promise<{ id: string, label: string }[]>,
  'theme/watch': ({ sId, themeId }: { sId: string, themeId: string }) => Promise<void>
}

export const ThemeHandlers: IThemeHandlers = {
  'theme/list': async function() {
    const externalThemes = themeManager.fileManager
      .scan()
      .map((manifest) => ({ id: manifest.id, label: manifest.name || manifest.id }));
    return [...globals.themes, ...externalThemes];
  },
  'theme/watch': async function({ sId, themeId }: { sId: string, themeId: string }) {
    state(sId).themeWatcher?.close();
    state(sId).themeWatcher = themeManager.watch(themeId, () => {
      state(sId).port.postMessage({ type: 'externalThemeChanged', input: themeId });
    });
  }
};
