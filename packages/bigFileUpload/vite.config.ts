import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from 'path'
import { obfuscator } from 'rollup-obfuscator';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    obfuscator(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
    }
  },
  build: {
    minify:'terser',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'packages/index.ts'),
      name: 'Vitelib',
      // the proper extensions will be added
      fileName:(format)=> `accessibility.${format}.js`,
      formats:['cjs','es','umd'],
    },
    cssCodeSplit:true,
  },
})
