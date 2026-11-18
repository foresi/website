// Rewrites the links of a Markdown file from foresi/foresi for the site:
// links to a published doc become site links, links to any other repo file
// become GitHub links at `ref`. Used by sync-docs and by the release pages.
import { posix } from 'node:path';

// Repo path (posix) → site route, or null when the file is not published.
export function routeFor(repoPath) {
	if (repoPath === 'CHANGELOG.md') return '/changelog/';
	if (repoPath === 'ROADMAP.md') return '/roadmap/';
	if (repoPath.startsWith('docs/') && repoPath.endsWith('.md')) return `/${repoPath.slice(0, -3).toLowerCase()}/`;
	return null;
}

// `published(route)` decides whether a route may be linked; release notes pass
// a check against the synced docs, so a doc removed later falls back to GitHub.
/** @param {{ repo: string, ref: string, published?: (route: string) => boolean }} options */
export function linkRewriter({ repo, ref, published = () => true }) {
	function rewriteTarget(target, fromRepoPath, isImage) {
		if (/^([a-z]+:|#|\/\/)/i.test(target)) return target;
		const [path, hash] = target.split('#');
		const repoPath = path.startsWith('/')
			? path.slice(1)
			: posix.normalize(posix.join(posix.dirname(fromRepoPath), path));
		const anchor = hash ? `#${hash}` : '';
		const route = routeFor(repoPath);
		if (route && !isImage && published(route)) return route + anchor;
		if (isImage) return `https://raw.githubusercontent.com/${repo}/${ref}/${repoPath}`;
		const kind = repoPath.endsWith('/') || !posix.extname(repoPath) ? 'tree' : 'blob';
		return `https://github.com/${repo}/${kind}/${ref}/${repoPath.replace(/\/$/, '')}${anchor}`;
	}

	return function rewriteLinks(markdown, fromRepoPath) {
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
	};
}
