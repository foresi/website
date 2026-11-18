// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import { llmsLinks, sidebar } from './docs.config.mjs';
import { site } from './site.config.mjs';

export default defineConfig({
	site: site.url,
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: site.name,
			description: site.description,
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: site.github }],
			editLink: { baseUrl: 'https://github.com/foresi/website/edit/main/' },
			customCss: ['./src/styles/fonts.css', './src/styles/brand.css'],
			sidebar: sidebar(),
			plugins: [
				starlightLlmsTxt({
					projectName: site.name,
					description: site.description,
					details: `${site.llmsDetails}\n\n${llmsLinks(site.url)}`,
					promote: ['index*', 'docs/import', 'docs/invoicing', 'docs/operations', 'docs/api', 'docs/mcp'],
					demote: ['docs/adr/**', 'docs/design/**', 'changelog'],
					exclude: ['devlog'],
				}),
			],
		}),
	],
});
