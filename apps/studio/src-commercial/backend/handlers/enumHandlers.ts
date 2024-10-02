import platformInfo from '@/common/platform_info';
import { state } from '@/handlers/handlerState';
import { promises as fs, constants, watch, existsSync } from 'fs';
import * as path from 'path';
import _ from 'lodash';

export interface IEnumHandlers {
  'enum/init': ({ sId }: { sId: string }) => Promise<void>,
  'enum/load': () => Promise<any[]>
}

export const EnumHandlers: IEnumHandlers = {
  'enum/init': async function({ sId }: { sId: string }) {
    if (!platformInfo.userDirectory || state(sId).enumsInitialized) return;
    const filename = path.join(platformInfo.userDirectory, 'enums.json');
    
    try {
      await fs.access(filename, constants.R_OK | constants.W_OK);
    } catch {
      // File hasn't been created yet
      return;
    }
    state(sId).watcher = watch(filename, (event, _filename) => {
      if (event == 'change') {
        state(sId).port.postMessage({ type: 'enumFileChanged' });
      }
    })
    state(sId).enumsInitialized = true;
  },
  'enum/load': async function() {
    const errorPrefix = 'ENUM LOADING ERROR: ';
    const filename = path.join(platformInfo.userDirectory, 'enums.json');

    if (!existsSync(filename)) return [];
    
    let enumsStr: string = null;
    try {
      enumsStr = (await fs.readFile(filename))?.toString()
    } catch (e) {
      throw new Error(`${errorPrefix} ${e}`)
    }
    
    if (!enumsStr) return [];

    let json: Array<any>;
    try {
      json = JSON.parse(enumsStr);
    } catch (e) {
      throw new Error(`${errorPrefix} ${e}`)
    }

    if (!_.isArray(json)) throw new Error(`${errorPrefix} Failed to parse enums.json`);

    return json;
  }
}
