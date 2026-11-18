// Release pages: the GitHub releases of foresi/foresi, loaded at build time
// into the `releases` content collection.
//
// Every merged feat/fix/perf PR in foresi/foresi publishes a release, tagged
// vX.Y.Z, titled "vX.Y.Z: summary", with notes in Keep a Changelog headings.
// The loader fails soft: when GitHub cannot be reached the build goes on with
// no releases, and /releases/ says so.
//
// Env:
//   GITHUB_TOKEN  optional; raises the API rate limit from 60 to 5000 requests an hour

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { repo } from '../../docs.config.mjs';
import { linkRewriter } from '../../scripts/links.mjs';


export const releaseSchema = z.object({
	version: z.string(),
	tag: z.string(),
	title: z.string(),
	summary: z.string(),
	date: z.coerce.date(),
	url: z.string(),
	prerelease: z.boolean(),
	upgrading: z.string().nullable(),
});

export type Release = z.infer<typeof releaseSchema>;

interface GitHubRelease {
	tag_name: string;
	name: string | null;
	body: string | null;
	draft: boolean;
	prerelease: boolean;
	published_at: string | null;
	html_url: string;
}

async function fetchReleases(logger: { info(m: string): void }): Promise<GitHubRelease[]> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'foresi-website',
	};
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	const all: GitHubRelease[] = [];
	let url: string | null = `https://api.github.com/repos/${repo}/releases?per_page=100`;
	while (url) {
		const res: Response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
		if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText} for ${url}`);
		all.push(...((await res.json()) as GitHubRelease[]));
		url = res.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
	}
	logger.info(`${all.length} releases from ${repo}${process.env.GITHUB_TOKEN ? '' : ' (no GITHUB_TOKEN)'}`);
	return all;
}

// Notes use ### for their sections; on the page they become h2, under the h1 title.
function promoteHeadings(markdown: string): string {
	const levels = [...markdown.matchAll(/^(#{1,6}) /gm)].map((m) => m[1].length);
	const shift = levels.length ? Math.min(...levels) - 2 : 0;
	if (shift <= 0) return markdown;
	return mapOutsideFences(markdown, (line) => line.replace(/^(#{1,6}) /, (_m, h: string) => `${'#'.repeat(h.length - shift)} `));
}

function mapOutsideFences(markdown: string, fn: (line: string) => string): string {
	let inFence = false;
	return markdown
		.split('\n')
		.map((line) => {
			if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
			return inFence ? line : fn(line);
		})
		.join('\n');
}

// "#173" → a link to the issue or pull request, as GitHub shows it.
function linkReferences(markdown: string): string {
	return mapOutsideFences(markdown, (line) =>
		line.replace(/(^|[\s(])#(\d+)\b/g, (_m, pre: string, n: string) => `${pre}[#${n}](https://github.com/${repo}/issues/${n})`),
	);
}

// The body of the "Upgrading" section, without its heading, or null.
export function upgradingSection(markdown: string): string | null {
	const lines = markdown.split('\n');
	const start = lines.findIndex((l) => /^#{2,3} Upgrading\s*$/i.test(l));
	if (start === -1) return null;
	const level = lines[start].indexOf(' ');
	let end = lines.findIndex((l, i) => i > start && new RegExp(`^#{1,${level}} `).test(l));
	if (end === -1) end = lines.length;
	const section = lines.slice(start + 1, end).join('\n').trim();
	return section || null;
}

// Text before the first heading: the release's one-line summary.
function summaryOf(markdown: string): string {
	const lead = markdown.split(/^#{1,6} /m)[0].trim();
	return lead.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
}

export function releasesLoader(): Loader {
	return {
		name: 'foresi-releases',
		load: async ({ store, logger, parseData, renderMarkdown }) => {
			let releases: GitHubRelease[];
			try {
				releases = await fetchReleases(logger);
			} catch (error) {
				// Keep what an earlier load stored (dev server); a fresh build gets none.
				logger.warn(`could not load releases, building without them: ${(error as Error).message}`);
				return;
			}
			store.clear();
			for (const r of releases) {
				if (r.draft || !r.published_at) continue;
				const version = r.tag_name.replace(/^v/, '');
				const name = (r.name ?? '').trim();
				const title = name.replace(new RegExp(`^${r.tag_name.replace(/\./g, '\\.')}\\s*:?\\s*`), '').trim();
				// Links in the notes point at the tag's files; a doc link stays on the site while that doc is published.
				const rewrite = linkRewriter({
					repo,
					ref: r.tag_name,
					published: (route: string) =>
						route === '/changelog/' || route === '/roadmap/' || existsSync(join(process.cwd(), 'src/content/docs', `${route.slice(0, -1)}.md`)),
				});
				const body = linkReferences(rewrite((r.body ?? '').replace(/\r\n/g, '\n'), 'CHANGELOG.md')).trim();
				const upgrading = upgradingSection(body);
				const data = await parseData({
					id: version,
					data: {
						version,
						tag: r.tag_name,
						title,
						summary: summaryOf(body),
						date: r.published_at,
						url: r.html_url,
						prerelease: r.prerelease,
						upgrading: upgrading ? (await renderMarkdown(upgrading)).html : null,
					},
				});
				store.set({ id: version, data, body, rendered: await renderMarkdown(promoteHeadings(body)) });
			}
		},
	};
}
