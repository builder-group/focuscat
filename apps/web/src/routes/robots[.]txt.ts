import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/robots.txt')({
	server: {
		handlers: {
			GET: async () => {
				const body = `User-agent: *
Allow: /

Sitemap: https://focuscat.app/sitemap.xml
`;

				return new Response(body, {
					headers: { 'Content-Type': 'text/plain' }
				});
			}
		}
	}
});
