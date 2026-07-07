import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// base: './' keeps every asset path relative, so the same build works on
// GitHub Pages project sites (https://user.github.io/sonata-elite/) with
// zero config changes.
export default defineConfig({
  base: './',
  plugins: [svelte(), tailwindcss()],
  build: {
    target: 'es2020'
  }
});
