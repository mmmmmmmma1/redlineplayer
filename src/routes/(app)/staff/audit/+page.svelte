<script lang="ts">
	let { data } = $props();
	const when = (t: number) => new Date(t).toLocaleString();
</script>

<svelte:head><title>Action log · Edgework</title></svelte:head>

<div class="overline">Staff</div>
<h1>Action log</h1>
<p class="sub">The last 200 staff and admin actions.</p>
<ul>
	{#each data.rows as r (r.id)}
		<li class="card">
			<code>{r.action}</code>
			<span>{r.actor ?? r.actorId} → {r.target ?? r.targetType}{r.detail ? ` (${r.detail})` : ''}</span>
			<span class="sub">{when(r.createdAt)}</span>
		</li>
	{:else}
		<li class="sub">Nothing yet.</li>
	{/each}
</ul>

<style>
	ul { list-style: none; padding: 0; margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
	li { display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; padding: 12px 14px; }
	code { color: var(--accent); }
</style>
