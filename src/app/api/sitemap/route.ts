import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const baseUrl = 'https://astrokalki.com';

    // Static pages
    const staticPages = [
      { url: baseUrl, lastMod: new Date().toISOString(), priority: '1.0' },
      { url: `${baseUrl}/#about`, lastMod: new Date().toISOString(), priority: '0.8' },
      { url: `${baseUrl}/#services`, lastMod: new Date().toISOString(), priority: '0.9' },
      { url: `${baseUrl}/#booking`, lastMod: new Date().toISOString(), priority: '0.9' },
      { url: `${baseUrl}/#insights`, lastMod: new Date().toISOString(), priority: '0.8' },
      { url: `${baseUrl}/#testimonials`, lastMod: new Date().toISOString(), priority: '0.7' },
      { url: `${baseUrl}/#micro-diagnosis`, lastMod: new Date().toISOString(), priority: '0.8' },
    ];

    // Dynamic insight pages
    const insights = await db.insight.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });

    const insightPages = insights.map((insight) => ({
      url: `${baseUrl}/insights/${insight.slug}`,
      lastMod: insight.updatedAt.toISOString(),
      priority: '0.7',
    }));

    const allPages = [...staticPages, ...insightPages];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastMod}</lastmod>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sitemap' },
      { status: 500 }
    );
  }
}
