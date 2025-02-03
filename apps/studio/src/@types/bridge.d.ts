import { BkConfig, BkConfigSource } from '@/common/bkConfig/BkConfigProvider';
import { IPlatformInfo } from '@/common/IPlatformInfo';
import { api } from '../preload';

declare global {
  interface Window {
    main: typeof api,
    platformInfo: IPlatformInfo
    bkConfigSource: BkConfigSource
    bkConfig: BkConfig
  }
}
