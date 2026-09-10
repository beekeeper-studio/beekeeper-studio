import { BksConfig, BksConfigSource } from '@/common/bksConfig/BksConfigProvider';
import { IPlatformInfo } from '@/common/IPlatformInfo';
import { WebPluginManager } from '@/services/plugin/web';

declare global {
  interface Window {
    platformInfo: IPlatformInfo
    bksConfigSource: BksConfigSource
    bksConfig: BksConfig
    bksPlugin: WebPluginManager
  }
}
