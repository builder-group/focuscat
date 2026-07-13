import { createFileRoute } from '@tanstack/react-router';

const routes = ['/', '/help', '/help/app-store', '/legal/privacy', '/legal/terms'] as const;

export const Route = createFileRoute('/sitemap.xml')({
	server: {
		handlers: {
			GET: async () => {
				const urls = routes
					.map(
						(path) => `  <url>
    <loc>https://focuscat.app${path}</loc>
  </url>`
					)
					.join('\n');
				const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

				return new Response(xml, {
					headers: { 'Content-Type': 'application/xml' }
				});
			}
		}
	}
});
