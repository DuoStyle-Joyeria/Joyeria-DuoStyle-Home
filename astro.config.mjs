import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://joyeria-duo-style-home.vercel.app',
  output: 'static',
  integrations: [sitemap()],
});