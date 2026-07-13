import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Analytics } from '@vercel/analytics/react';
import React from 'react';
import { AppProvider } from '@/app';
import styles from '../styles.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			}
		],
		links: [
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{
				rel: 'preconnect',
				href: 'https://fonts.gstatic.com',
				crossOrigin: 'anonymous'
			},
			{ rel: 'preconnect', href: 'https://api.fontshare.com' },
			// https://fonts.google.com/specimen/Inter
			// https://fonts.google.com/specimen/Caveat
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Caveat:wght@400..700&display=swap'
			},
			// https://www.fontshare.com/fonts/erode
			{
				rel: 'stylesheet',
				href: 'https://api.fontshare.com/v2/css?f[]=erode@1,2&display=swap'
			},
			{ rel: 'stylesheet', href: styles }
		],
		scripts: [
			// Apply theme before paint to prevent flash
			{
				children: `(function(){var theme='auto';try{var s=localStorage.getItem('focuscat-app-settings');if(s){var j=JSON.parse(s);theme=(j.appearance&&j.appearance.theme)||'auto';}}catch(e){}var dark=theme==='dark'||(theme==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);})();`
			}
		]
	}),
	shellComponent: RootDocument
});

function RootDocument(props: { children: React.ReactNode }) {
	const { children } = props;

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-base-0 text-base-950 font-sans">
				<AppProvider>{children}</AppProvider>
				<TanStackRouterDevtools position="bottom-right" />
				<Scripts />
				<Analytics />
			</body>
		</html>
	);
}
