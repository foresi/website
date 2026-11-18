// One place for the facts every page, feed and crawler file repeats.
export const site = {
	name: 'Foresi',
	url: 'https://foresi.app/',
	github: 'https://github.com/foresi/foresi',
	// Public key of the Ahrefs Web Analytics project "Foresi"; it is in every page's HTML anyway.
	ahrefsAnalyticsKey: 'zGxqM+xzo30o6QKEAGhZ8Q',
	// The same sentence as the GitHub repo description. Change both together.
	description:
		'Open-source business system for small firms: contacts, invoices, payments, projects and tasks, with a REST API and an MCP server.',
	llmsDetails: [
		'Foresi is a self-hosted PHP 8.4 / Symfony application licensed under AGPL-3.0-only. The source is at https://github.com/foresi/foresi.',
		'It is at an early stage (0.x). Czech rules (VAT, ISDOC, the business register) come first; other countries plug in as country modules.',
		'Tax and legal rules described in the docs are statements of the software, not tax or legal advice.',
	].join('\n\n'),
};
