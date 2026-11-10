import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const apiPort = environment.PORT || process.env.PORT || '3001'
  const usePreviewCatalog = process.env.STREAMX_E2E_PREVIEW === 'true'

  return {
    root: fileURLToPath(new URL('./web-app', import.meta.url)),
    plugins: [react()],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    ...(usePreviewCatalog ? {
      define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
        'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
      },
    } : {}),
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
