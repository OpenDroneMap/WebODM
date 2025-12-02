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
			social: [
				{ icon: 'discourse', label: 'Community Forum', href: 'https://community.opendronemap.org' },
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/OpenDroneMap/WebODM' }
			],
			sidebar: [
				{
					label: 'Installation',
					slug: 'installation'
				},
				{
					label: 'Hardware Requirements',
					slug: 'hardware-requirements'
				},
				{
					label: 'Common Tasks',
					slug: 'common-tasks'
				},
				{
					label: 'Frequently Asked Questions',
					slug: 'faq'
				},
				{
					label: 'Support the Project',
					slug: 'support-the-project'
				},
				{
					label: 'Developers',
					items: [
						{
							label: 'Contributing',
							slug: 'contributing'
						},
						{
							label: 'Architecture',
							slug: 'architecture'
						},
						{
							label: 'Roadmap',
							slug: 'roadmap'
						},
						{
							label: 'Plugin Development Guide',
							slug: 'plugin-development-guide'
						},
						{
							label: 'API Quickstart',
							slug: 'quickstart'
						},
						{
							label: 'API Reference',
							autogenerate: { directory: 'reference' },
						},
					]
				},
			],
		}),
	],
});
