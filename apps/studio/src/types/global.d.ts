interface Window {
  showThemeManagerModal?: () => void;
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
