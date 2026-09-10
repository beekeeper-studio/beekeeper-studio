import { api } from './entrypoints/preload'; // breaks license, we gotta figure something else out

declare global {
  interface Window {
    main: typeof api,
  }
}
