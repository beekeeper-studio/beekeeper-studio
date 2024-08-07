import { api } from '../preload';

declare global {
  interface Window {
    main: typeof api
  }
}
