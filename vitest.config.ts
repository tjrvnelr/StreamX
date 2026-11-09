import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(''),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(''),
    'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
  },
})
