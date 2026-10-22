import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envParent = loadEnv(mode, '../', ['VITE_', 'MODE_'])
  const envCurrent = loadEnv(mode, '.', ['VITE_', 'MODE_'])
  const env = { ...envParent, ...envCurrent }

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'MODE_'],
    define: {
      'import.meta.env.MODE_DEV': JSON.stringify(env.MODE_DEV ?? process.env.MODE_DEV ?? ''),
    },
  }
})
