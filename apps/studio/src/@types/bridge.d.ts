import { BksConfig, BksConfigSource } from '@/common/bksConfig/BksConfigProvider';
import { IPlatformInfo } from '@/common/IPlatformInfo';
import { api } from '../preload';

declare global {
  interface Window {
    main: typeof api,
    platformInfo: IPlatformInfo
    bksConfigSource: BksConfigSource
    bksConfig: BksConfig
    electron?: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeListener: (channel: string, func: (...args: any[]) => void) => void;
      }
    };
    $root?: {
      $emit: (event: string, ...args: any[]) => void;
    };
  }
}
