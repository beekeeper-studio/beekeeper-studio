import { BksConfig, BksConfigSource } from '@/common/bksConfig/BksConfigProvider';
import { IPlatformInfo } from '@/common/IPlatformInfo';
import { WebPluginManager } from '@/services/plugin/web';
// import { api } from '/entrypoints/preload'; // breaks license, we gotta figure something else out

declare global {
  interface Window {
    main: typeof api,
    platformInfo: IPlatformInfo
    bksConfigSource: BksConfigSource
    bksConfig: BksConfig
    bksPlugin: WebPluginManager
  }
}
