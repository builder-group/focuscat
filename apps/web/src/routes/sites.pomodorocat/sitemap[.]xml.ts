import { createFileRoute } from '@tanstack/react-router';
import { allPomodorocatBlogs } from 'content-collections';

const sitemapRoutes: TSitemapRoute[] = [
	{ path: '', changefreq: 'weekly', priority: '1.0' },
	{ path: 'blog', changefreq: 'weekly', priority: '0.9' },
	{
		path: 'blog/:slug',
		changefreq: 'monthly',
		priority: '0.8',
		expand: () =>
			allPomodorocatBlogs.map((p) => ({
				slug: p._meta.path,
				lastmod: p.updated ?? p.published
			}))
	}
];

export const Route = createFileRoute('/sites/pomodorocat/sitemap.xml')({
	server: {
		handlers: {
			GET: async () => {
				const urls = buildSitemapUrls(sitemapRoutes);
				const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map((u) => {
		const lastmod = u.lastmod != null ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
		return `  <url>
    <loc>${u.loc}</loc>${lastmod}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
	})
	.join('\n')}
</urlset>`;
				return new Response(xml, {
					headers: { 'Content-Type': 'application/xml' }
				});
			}
		}
	}
});

function buildSitemapUrls(
	sitemapRoutes: TSitemapRoute[],
	origin = 'https://pomodorocat.com'
): TSitemapUrl[] {
	const urls: TSitemapUrl[] = [];
	for (const route of sitemapRoutes) {
		if (route.expand != null) {
			for (const params of route.expand()) {
				const path = route.path.replace(/:(\w+)/g, (_, key) => params[key] ?? '');
				urls.push({
					loc: `${origin}/${path}`,
					lastmod: params['lastmod'],
					changefreq: route.changefreq,
					priority: route.priority
				});
			}
		} else {
			urls.push({
				loc: route.path ? `${origin}/${route.path}` : `${origin}/`,
				changefreq: route.changefreq,
				priority: route.priority
			});
		}
	}
	return urls;
}

interface TSitemapRoute {
	path: string;
	changefreq: 'weekly' | 'monthly';
	priority: string;
	expand?: () => Record<string, string>[];
}

interface TSitemapUrl {
	loc: string;
	lastmod?: string;
	changefreq: 'weekly' | 'monthly';
	priority: string;
}
