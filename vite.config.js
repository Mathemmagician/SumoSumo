import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: "../dist",
  },
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  },
});
