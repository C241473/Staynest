import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.BACKEND_PORT || 5050}`,
        changeOrigin: true,
      },
    },
  },
})
