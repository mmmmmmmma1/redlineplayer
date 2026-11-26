<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Edgework</title>
</svelte:head>

<main>
	{@render children()}
</main>

<style>
	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 20px 16px 120px;
	}
</style>
