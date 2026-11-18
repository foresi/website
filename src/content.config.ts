import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { releaseSchema, releasesLoader } from './lib/releases';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	releases: defineCollection({ loader: releasesLoader(), schema: releaseSchema }),
};
