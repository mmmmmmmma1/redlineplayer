<script lang="ts">
	import { CATEGORIES } from '#lib/data/library.js';
	let { data } = $props();
</script>

<svelte:head><title>Library · Edgework</title></svelte:head>

<div class="overline">{data.list.length} exercises</div>
<h1>Library</h1>

<form method="GET" class="filters">
	<input type="search" name="q" value={data.q} placeholder="Search by name or muscle" aria-label="Search exercises" />
	<select name="category" value={data.category} aria-label="Category" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
		<option value="">All categories</option>
		{#each Object.entries(CATEGORIES) as [k, title] (k)}
			<option value={k}>{title}</option>
		{/each}
	</select>
	<noscript><button class="btn secondary">Search</button></noscript>
</form>

<ul>
	{#each data.list as e (e.id)}
		<li>
			<a class="card" href="/exercise/{e.id}">
				<span class="name">{e.name}</span>
				<span class="sub">{CATEGORIES[e.category]} · {e.target}</span>
				<span class="sub summary">{e.summary}</span>
			</a>
		</li>
	{:else}
		<li class="sub">No exercises match. Try another word.</li>
	{/each}
</ul>

<style>
	.filters { display: flex; gap: 8px; margin: 16px 0; }
	.filters select { width: auto; max-width: 45%; }
	ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	a.card { display: flex; flex-direction: column; gap: 2px; text-decoration: none; color: var(--text); padding: 14px 16px; }
	.name { font-weight: 700; }
	.summary { font-size: 14px; }
</style>
