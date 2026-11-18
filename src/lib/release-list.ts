import { getCollection, type CollectionEntry } from 'astro:content';
import { compareVersions } from './semver';

export type ReleaseEntry = CollectionEntry<'releases'>;

/** Every release, newest first. */
export async function releases(): Promise<ReleaseEntry[]> {
	return (await getCollection('releases')).sort((a, b) => compareVersions(b.data.version, a.data.version));
}

export const releaseLink = (version: string) => `/releases/${version}/`;

export const formatDate = (date: Date) =>
	date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** "v0.6.0: Saved views", or just the tag when the release has no title. */
export const releaseHeading = (r: ReleaseEntry['data']) => (r.title ? `${r.tag}: ${r.title}` : r.tag);
