<script lang="ts">
	import { CATEGORIES, EQUIPMENT, MUSCLES, formatTarget, levelTitle } from '#lib/data/library.js';
	import HowTo from '#lib/components/HowTo.svelte';
	let { data } = $props();
	const e = $derived(data.exercise);
</script>

<svelte:head><title>{e.name} · Edgework</title></svelte:head>

<a class="back" href="/library">‹ Library</a>
<div class="overline">{CATEGORIES[e.category]} · {levelTitle(e)}</div>
<h1>{e.name}</h1>
<p class="target">{formatTarget(e)}</p>
<p class="sub">{e.summary}</p>

<section class="card">
	<h2>How to do it</h2>
	<ol>
		{#each e.steps as s, i (i)}<li>{s}</li>{/each}
	</ol>
</section>

<section class="card">
	<h2>Cues</h2>
	<ul>
		{#each e.cues as c, i (i)}<li>{c}</li>{/each}
	</ul>
</section>

<section class="card">
	<h2>Why it helps</h2>
	<p>{e.why}</p>
</section>

<section class="card muscles">
	<h2>Muscles</h2>
	<p>{e.primary.map((m) => MUSCLES[m]).join(', ')}</p>
	{#if e.secondary.length}<p class="sub">Also: {e.secondary.map((m) => MUSCLES[m]).join(', ')}</p>{/if}
	{#if e.equipment.length}<p class="sub">Equipment: {e.equipment.map((q) => EQUIPMENT[q] ?? q).join(', ')}</p>{/if}
</section>

<HowTo exerciseId={e.id} exerciseName={e.name} videos={data.videos} staff={data.staff} />

<style>
	.back { display: inline-block; margin-bottom: 12px; text-decoration: none; }
	.target { font-size: 20px; font-weight: 700; color: var(--accent); margin: 8px 0 4px; }
	section { margin-top: 14px; }
	h2 { font-size: 15px; margin-bottom: 8px; }
	ol, ul { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
	.muscles p + p { margin-top: 4px; }
</style>
