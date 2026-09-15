import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: { env: Record<string, string | undefined> }

// GitHub Pages serves this project from the repository name. Local development
// stays at / so the same app is pleasant to run with `pnpm dev`.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/012s-jelly-orbit/' : '/',
  plugins: [react()],
})
