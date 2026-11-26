<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children, data } = $props();
	const active = $derived(data.me?.status === 'active');
	const staff = $derived(active && (data.me?.role === 'staff' || data.me?.role === 'admin'));
	const tabs = $derived([
		{ href: '/library', label: 'Library', count: 0 },
		...(staff ? [{ href: '/staff/accounts', label: 'Staff', count: data.staffWaiting }] : []),
		{ href: '/profile', label: 'Profile', count: 0 }
	]);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Edgework</title>
</svelte:head>

<main>
	{@render children()}
</main>

{#if active}
	<nav aria-label="Main">
		<a class="brand" href="/">Edgework</a>
		{#each tabs as t (t.href)}
			<a href={t.href} aria-current={page.url.pathname.startsWith(t.href.split('/').slice(0, 2).join('/')) ? 'page' : undefined}
				>{t.label}{#if t.count}<span class="badge"> {t.count}</span>{/if}</a
			>
		{/each}
	</nav>
{/if}

<style>
	main { max-width: 760px; margin: 0 auto; padding: 20px 16px 120px; }
	nav {
		position: fixed; left: 12px; right: 12px; bottom: calc(10px + env(safe-area-inset-bottom, 0px));
		display: flex; align-items: center; gap: 4px; padding: 6px;
		background: color-mix(in srgb, var(--surface) 85%, transparent);
		backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--stroke); border-radius: 24px;
	}
	nav a { flex: 1; text-align: center; padding: 10px 6px; border-radius: 18px; color: var(--text2); text-decoration: none; font-weight: 600; font-size: 14px; }
	nav a[aria-current='page'] { color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
	.brand { display: none; }
	.badge { display: inline-block; min-width: 18px; margin-left: 4px; padding: 0 5px; border-radius: 99px; background: var(--red); color: #fff; font-size: 11px; line-height: 18px; }
	@media (min-width: 900px) {
		main { margin-left: 240px; }
		nav { top: 0; left: 0; right: auto; bottom: 0; width: 220px; flex-direction: column; align-items: stretch; border-radius: 0; border-width: 0 1px 0 0; padding: 24px 14px; }
		nav a { flex: none; text-align: left; }
		.brand { display: block; color: var(--text); font-size: 20px; font-weight: 800; margin-bottom: 12px; }
	}
</style>
