import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // 不清空 dist/，避免构建时删除运行时必需的 dist/data（geojson）；
    // 同时保证已提交的 dist 产物在沙箱批量删除保护下也能正常重新构建。
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        map: resolve(__dirname, 'map.html'),
        poster: resolve(__dirname, 'poster.html'),
      },
    },
  },
})
