import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: ['dashboard.servpro.tn', 'dashboard.servpro.local', 'localhost', '127.0.0.1'],
  },
})
