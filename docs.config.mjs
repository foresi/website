// Where the docs come from and how the sidebar groups them.
// A new doc in foresi/foresi is published automatically; until it is added
// to a group here it appears under "More".

import { existsSync, readFileSync, readdirSync } from 'node:fs';

export const repo = 'foresi/foresi';

export const groups = [
	{
		label: 'Using Foresi',
		items: ['import', 'idoklad', 'invoicing', 'sending', 'reminders', 'recurring', 'bank-pairing', 'purchasing', 'cash-flow', 'projects', 'people'],
	},
	{
		label: 'Running and extending',
		items: ['operations', 'logging', 'api', 'mcp', 'development'],
	},
];

const docsDir = new URL('./src/content/docs/docs/', import.meta.url);

function topLevelDocs() {
	if (!existsSync(docsDir)) return [];
	return readdirSync(docsDir)
		.filter((f) => f.endsWith('.md') && f !== 'index.md')
		.map((f) => f.slice(0, -3));
}

export function sidebar() {
	const present = new Set(topLevelDocs());
	const listed = groups.flatMap((g) => g.items);
	const more = [...present].filter((name) => !listed.includes(name)).sort();
	const sub = (dir) => existsSync(new URL(`${dir}/`, docsDir));
	return [
		{ label: 'Documentation', link: '/docs/' },
		...groups.map((g) => ({
			label: g.label,
			items: g.items.filter((name) => present.has(name)).map((name) => `docs/${name}`),
		})),
		...(more.length ? [{ label: 'More', items: more.map((name) => `docs/${name}`) }] : []),
		...(sub('adr') ? [{ label: 'Architecture decisions', collapsed: true, items: [{ autogenerate: { directory: 'docs/adr' } }] }] : []),
		...(sub('design') ? [{ label: 'Design notes', collapsed: true, items: [{ autogenerate: { directory: 'docs/design' } }] }] : []),
		{ label: 'Project', items: [{ label: 'Releases', link: '/releases/' }, 'changelog', 'roadmap', 'devlog'] },
	];
}

// Title and description of each generated page, read from its frontmatter.
function meta(file) {
	const head = readFileSync(file, 'utf8').split('\n---')[0];
	const field = (key) => {
		const m = head.match(new RegExp(`^${key}: (.+)$`, 'm'));
		return m ? JSON.parse(m[1]) : undefined;
	};
	return { title: field('title'), description: field('description') };
}

// Markdown link list of the main pages, for llms.txt.
export function llmsLinks(siteUrl) {
	const content = new URL('./src/content/docs/', import.meta.url);
	const line = (path, route) => {
		const file = new URL(path, content);
		if (!existsSync(file)) return null;
		const { title, description } = meta(file);
		return `- [${title}](${siteUrl}${route})${description ? `: ${description}` : ''}`;
	};
	const present = new Set(topLevelDocs());
	const listed = groups.flatMap((g) => g.items);
	const sections = [
		...groups.map((g) => ({ label: g.label, items: g.items })),
		{ label: 'More', items: [...present].filter((n) => !listed.includes(n)).sort() },
	];
	const out = [];
	for (const s of sections) {
		const lines = s.items.filter((n) => present.has(n)).map((n) => line(`docs/${n}.md`, `docs/${n}/`)).filter(Boolean);
		if (lines.length) out.push(`## ${s.label}\n\n${lines.join('\n')}`);
	}
	const project = [
		`- [Releases](${siteUrl}releases/): every version since 0.5.0 with its release notes and upgrade steps`,
		line('changelog.md', 'changelog/'),
		line('roadmap.md', 'roadmap/'),
	].filter(Boolean);
	if (project.length) out.push(`## Project\n\n${project.join('\n')}`);
	return out.join('\n\n');
}
