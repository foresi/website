// Atom feed of the releases, newest first.
import type { APIRoute } from 'astro';
import { repo } from '../../../docs.config.mjs';
import { site } from '../../../site.config.mjs';
import { releaseHeading, releaseLink, releases } from '../../lib/release-list';

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
	const all = (await releases()).slice(0, 50);
	const abs = (path: string) => new URL(path, site.url).href;
	const updated = all[0]?.data.date ?? new Date(0);
	const entries = all.map(
		(r) => `	<entry>
		<id>${xml(abs(releaseLink(r.data.version)))}</id>
		<title>${xml(releaseHeading(r.data))}</title>
		<link rel="alternate" type="text/html" href="${xml(abs(releaseLink(r.data.version)))}"/>
		<published>${r.data.date.toISOString()}</published>
		<updated>${r.data.date.toISOString()}</updated>
		${r.data.summary ? `<summary>${xml(r.data.summary)}</summary>\n\t\t` : ''}<content type="html">${xml(r.rendered?.html ?? '')}</content>
	</entry>`,
	);
	const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:base="${xml(site.url)}">
	<id>${xml(abs('/releases/'))}</id>
	<title>${xml(site.name)} releases</title>
	<subtitle>Every Foresi version with its release notes.</subtitle>
	<link rel="alternate" type="text/html" href="${xml(abs('/releases/'))}"/>
	<link rel="self" type="application/atom+xml" href="${xml(abs('/releases/feed.xml'))}"/>
	<link rel="related" href="https://github.com/${repo}/releases"/>
	<updated>${updated.toISOString()}</updated>
	<author><name>${xml(site.name)}</name></author>
${entries.join('\n')}
</feed>
`;
	return new Response(body, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
};
