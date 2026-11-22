import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Halaman demo konsep (src/pages/app) dan graf demo (components/knowledge-graph)
    // memakai pola render-ref khusus simulasi; aturan ketat React Hooks v7
    // dinonaktifkan di sana saja.
    files: ['src/pages/app/**', 'src/components/knowledge-graph.tsx', 'src/components/ui/**'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Data-fetching di mount (setState via effect) adalah pola standar halaman ini;
    // komponen shadcn/ui sah mengekspor konstanta (variants) di samping komponen.
    files: ['src/pages/**', 'src/components/**'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
