// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import remarkWikiLinks from './src/lib/remark-wikilinks.mjs';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'wiki';
const owner = process.env.GITHUB_REPOSITORY_OWNER ?? 'YOUR_USERNAME';
const site = process.env.PUBLIC_SITE_URL || `https://${owner}.github.io`;
const base = process.env.PUBLIC_BASE_PATH || (repoName.endsWith('.github.io') ? '/' : `/${repoName}`);

// https://astro.build/config
export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [[remarkWikiLinks, { basePath: base }]],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
