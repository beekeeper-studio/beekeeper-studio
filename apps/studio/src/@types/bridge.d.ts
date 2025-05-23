import { BksConfig, BksConfigSource } from '@/common/bksConfig/BksConfigProvider';
import { IPlatformInfo } from '@/common/IPlatformInfo';
import { WebPluginManager } from '@/services/plugin/web';
import { api } from '../preload';

declare global {
  interface Window {
    main: typeof api,
    platformInfo: IPlatformInfo
    bksConfigSource: BksConfigSource
    bksConfig: BksConfig
    webPluginManager: WebPluginManager
  }
}
