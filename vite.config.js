import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const page = (file) => fileURLToPath(new URL(file, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/ntustcdvc-seed/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      // 兩個頁面：主網站，以及不需登入的「智慧語錄」（wisdom.html）
      input: {
        main: page('./index.html'),
        wisdom: page('./wisdom.html'),
      },
    },
  },
})
