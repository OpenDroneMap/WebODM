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
					label: 'For Developers',
					slug: 'fordevelopers'
				},
			],
		}),
	],
});
