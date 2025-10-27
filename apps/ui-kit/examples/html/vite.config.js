import { defineConfig } from 'vite';

export default defineConfig({
  // Base public path when served in production
  base: './',
  
  // Configure server options
  server: {
    open: true
  }
});