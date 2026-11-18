# foresi.app

The website of [Foresi](https://github.com/foresi/foresi), an open-source business system for small firms. It is built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build) and served from a Cloudflare Worker.

## Where the content comes from

The docs, the changelog and the roadmap are not kept here. `scripts/sync-docs.mjs` copies them from the `main` branch of [foresi/foresi](https://github.com/foresi/foresi) on every build, so edit them there. The sidebar groups are in `docs.config.mjs`; a new doc is published even before it is placed in a group.

Pages written for the site itself (the home page, the devlog) live in `src/content/docs/`.

## Run it

Node 22.12 or newer.

```sh
npm ci
npm run dev                                   # clones foresi/foresi main into a temp dir
FORESI_SOURCE=../foresi npm run dev           # or reads a local checkout
npm run build && npm run check:links
```

## Deploy

Cloudflare Workers Builds, connected to this repository, deploys every push to `main` with `npm ci && npm run build` and `npx wrangler deploy`, and builds a preview URL for every other branch. Docs changes in foresi/foresi trigger a rebuild through a Workers Builds deploy hook, which foresi/foresi keeps as its `WEBSITE_DEPLOY_HOOK` secret. GitHub Actions only checks pull requests: build and internal links. No Cloudflare API token is stored in GitHub.

## Licence

Code: [MIT](LICENSE). Texts written for this site: [CC BY 4.0](LICENSE-CONTENT). The docs pulled from foresi/foresi keep that repository's licence.
