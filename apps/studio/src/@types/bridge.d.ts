import { IPlatformInfo } from '@/common/IPlatformInfo';
import { api } from '../preload';

declare global {
  interface Window {
    main: typeof api,
    platformInfo: IPlatformInfo
  }
}
