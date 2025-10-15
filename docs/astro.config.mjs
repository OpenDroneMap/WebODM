// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'WebODM',
			logo: {
				src: './src/assets/logo.svg',
				replacesTitle: true
			},
			favicon: './src/assets/favicon.svg',
			editLink: {
				baseUrl: 'https://github.com/OpenDroneMap/WebODM/edit/master/docs/',
			},
			customCss: [
				'./src/styles/custom.css',
			],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/OpenDroneMap/WebODM' }],
			sidebar: [
				{
					label: 'Quickstart',
					slug: 'quickstart'
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Contributing',
					slug: 'contributing'
				},
				{
					label: 'Plugin Development Guide',
					slug: 'plugin-development-guide'
				},
			],
		}),
	],
});
