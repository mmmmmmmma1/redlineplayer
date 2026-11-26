<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();
	const links = [
		{ href: '/staff/accounts', label: 'Accounts' },
		{ href: '/staff/review', label: 'Review' },
		{ href: '/staff/audit', label: 'Action log' }
	];
</script>

<nav class="sub-nav" aria-label="Staff">
	{#each links as l (l.href)}
		<a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.label}</a>
	{/each}
</nav>
{@render children()}

<style>
	.sub-nav { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
	.sub-nav a { padding: 7px 12px; border-radius: 99px; background: var(--surface); color: var(--text2); text-decoration: none; font-weight: 600; font-size: 14px; }
	.sub-nav a[aria-current='page'] { color: var(--bg); background: var(--accent); }
</style>
