// Pulls the public docs of foresi/foresi into the Starlight content collection.
//
// The app repo is the source of truth for its docs, changelog and roadmap.
// This script copies them at build time, adds Starlight frontmatter and
// rewrites links: links between docs become site links, links to any other
// repo file become GitHub links.
//
// Env:
//   FORESI_SOURCE  path to a local checkout to read instead of cloning
//   FORESI_REF     branch or tag to clone (default: main)

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groups, repo } from '../docs.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/content/docs');
const ref = process.env.FORESI_REF || 'main';

function checkout() {
	if (process.env.FORESI_SOURCE) return process.env.FORESI_SOURCE;
	const dir = mkdtempSync(join(tmpdir(), 'foresi-docs-'));
	const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
	git('clone', '--depth=1', '--filter=blob:none', '--sparse', '--branch', ref, `https://github.com/${repo}.git`, '.');
	git('sparse-checkout', 'set', 'docs');
	return dir;
}

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

// Repo path (posix) → site route, or null when the file is not published.
function routeFor(repoPath) {
	if (repoPath === 'CHANGELOG.md') return '/changelog/';
	if (repoPath === 'ROADMAP.md') return '/roadmap/';
	if (repoPath.startsWith('docs/') && repoPath.endsWith('.md')) return `/${repoPath.slice(0, -3).toLowerCase()}/`;
	return null;
}

function rewriteTarget(target, fromRepoPath, isImage) {
	if (/^([a-z]+:|#|\/\/)/i.test(target)) return target;
	const [path, hash] = target.split('#');
	const repoPath = path.startsWith('/')
		? path.slice(1)
		: posix.normalize(posix.join(posix.dirname(fromRepoPath), path));
	const anchor = hash ? `#${hash}` : '';
	const route = routeFor(repoPath);
	if (route && !isImage) return route + anchor;
	if (isImage) return `https://raw.githubusercontent.com/${repo}/${ref}/${repoPath}`;
	const kind = repoPath.endsWith('/') || !posix.extname(repoPath) ? 'tree' : 'blob';
	return `https://github.com/${repo}/${kind}/${ref}/${repoPath.replace(/\/$/, '')}${anchor}`;
}

function rewriteLinks(markdown, fromRepoPath) {
	let inFence = false;
	return markdown
		.split('\n')
		.map((line) => {
			if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
			if (inFence) return line;
			return line
				.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (_m, bang, text, target, title = '') =>
					`${bang}[${text}](${rewriteTarget(target, fromRepoPath, bang === '!')}${title})`,
				)
				.replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/, (_m, head, target) => head + rewriteTarget(target, fromRepoPath, false));
		})
		.join('\n');
}

function plain(text) {
	return text
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[`*_]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function describe(body) {
	const para = body
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.find((p) => p && !/^(#|>|\||-|\*|`|!|\[|<|\d+\.)/.test(p));
	if (!para) return undefined;
	const text = plain(para);
	if (text.length <= 160) return text;
	const cut = text.slice(0, 157);
	return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

const yaml = (value) => JSON.stringify(value);

function convert(source, repoPath, outPath, order) {
	const raw = readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
	const match = raw.match(/^# (.+)\n/m);
	if (!match) throw new Error(`${repoPath}: no top-level heading to use as the title`);
	const title = plain(match[1]);
	const body = rewriteLinks(raw.replace(match[0], ''), repoPath).trim();
	const description = describe(body);
	const frontmatter = [
		'---',
		`title: ${yaml(title)}`,
		description ? `description: ${yaml(description)}` : null,
		`editUrl: ${yaml(`https://github.com/${repo}/edit/${ref}/${repoPath}`)}`,
		order === undefined ? null : `sidebar:\n  order: ${order}`,
		'---',
		'',
	].filter((line) => line !== null);
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, `${frontmatter.join('\n')}\n<!-- Generated from ${repo}/${repoPath}. Edit it there, not here. -->\n\n${body}\n`);
}

const source = checkout();
for (const generated of ['docs', 'changelog.md', 'roadmap.md']) rmSync(join(outDir, generated), { recursive: true, force: true });

// Docs: every Markdown file under docs/, at the same path on the site.
const docsDir = join(source, 'docs');
const known = groups.flatMap((g) => g.items ?? []);
const docFiles = walk(docsDir).filter((f) => f.endsWith('.md'));
for (const file of docFiles) {
	const repoPath = `docs/${relative(docsDir, file).split('\\').join('/')}`;
	const name = posix.basename(repoPath, '.md');
	const order = known.indexOf(name);
	convert(file, repoPath, join(outDir, repoPath.toLowerCase()), order === -1 ? undefined : order);
}

// Changelog and roadmap at the repo root.
for (const [file, out] of [['CHANGELOG.md', 'changelog.md'], ['ROADMAP.md', 'roadmap.md']]) {
	const path = join(source, file);
	if (!existsSync(path)) throw new Error(`${file} is missing in ${repo}@${ref}`);
	convert(path, file, join(outDir, out));
}

// Top-level docs that no sidebar group lists still get published; say so,
// so they can be placed in docs.config.mjs.
const unplaced = docFiles
	.map((f) => relative(docsDir, f))
	.filter((p) => !p.includes('/') && !known.includes(posix.basename(p, '.md')));
if (unplaced.length) console.warn(`sync-docs: not in any sidebar group, listed under "More": ${unplaced.join(', ')}`);

// /docs/ itself: an index of every group, so the URL never 404s.
{
	const titleOf = (name) => readFileSync(join(outDir, 'docs', `${name}.md`), 'utf8').match(/^title: (.+)$/m)[1];
	const present = docFiles.map((f) => relative(docsDir, f)).filter((p) => !p.includes('/')).map((p) => posix.basename(p, '.md'));
	const sections = [...groups, { label: 'More', items: present.filter((n) => !known.includes(n)).sort() }]
		.map((g) => ({ label: g.label, items: g.items.filter((n) => present.includes(n)) }))
		.filter((g) => g.items.length)
		.map((g) => `## ${g.label}\n\n${g.items.map((n) => `- [${JSON.parse(titleOf(n))}](/docs/${n}/)`).join('\n')}`);
	sections.push('## Architecture decisions\n\nWhy Foresi is built the way it is, one record per decision. Start with [the first record](/docs/adr/0001-record-architecture-decisions/).');
	writeFileSync(
		join(outDir, 'docs', 'index.md'),
		`---\ntitle: Documentation\ndescription: ${yaml(`How to install, run and use Foresi. Generated from the docs folder of ${repo}.`)}\neditUrl: false\n---\n\nThese pages come from the [docs folder](https://github.com/${repo}/tree/${ref}/docs) of the Foresi repository and are rebuilt when it changes.\n\n${sections.join('\n\n')}\n`,
	);
}

console.log(`sync-docs: ${docFiles.length} docs, changelog and roadmap from ${repo}@${ref}`);
