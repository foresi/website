// Fails when a page in dist/ links to a site path that was not built.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const pages = [];
(function walk(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path);
		else if (path.endsWith('.html')) pages.push(path);
	}
})(dist);

const exists = (url) => {
	const target = join(dist, decodeURI(url));
	return existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
};

const broken = [];
for (const page of pages) {
	for (const [, url] of readFileSync(page, 'utf8').matchAll(/href="(\/[^"#?]*)/g)) {
		if (!exists(url)) broken.push(`${url} (in ${page})`);
	}
}
if (broken.length) {
	console.error(`check-links: ${broken.length} broken internal links\n${broken.join('\n')}`);
	process.exit(1);
}
console.log(`check-links: ${pages.length} pages, no broken internal links`);
