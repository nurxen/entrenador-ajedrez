import { defineConfig } from 'vite';
// base relativa: funciona igual en GitHub Pages (/<repo>/), Netlify o un dominio propio
export default defineConfig({ base: './', build: { target: 'es2022' } });
