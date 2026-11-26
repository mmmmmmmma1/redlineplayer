<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	const when = (t: number) => new Date(t).toLocaleString();
</script>

<svelte:head><title>Review · Edgework</title></svelte:head>

<div class="overline">Staff</div>
<h1>Review</h1>
{#if form?.error}<p class="error">{form.error}</p>{/if}

<section aria-labelledby="requests">
	<h2 id="requests">Video requests <span class="sub">{data.requests.length}</span></h2>
	{#each data.requests as r (r.id)}
		<article class="card">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video src="/video/{r.id}/file" controls preload="metadata" playsinline></video>
			<p><b>{r.title}</b> <span class="sub">· {r.exercise} · by {r.owner} · {when(r.createdAt)}</span></p>
			<form method="POST" use:enhance>
				<input type="hidden" name="id" value={r.id} />
				<label for="reason-{r.id}">Reason (optional)</label>
				<input id="reason-{r.id}" name="reason" maxlength="200" placeholder="Shown to the player if you decline" />
				<div class="row">
					<button class="btn" formaction="?/approve">Add for everyone</button>
					<button class="btn secondary" formaction="?/decline">Decline</button>
				</div>
			</form>
		</article>
	{:else}
		<p class="sub">No requests right now.</p>
	{/each}
</section>

<section aria-labelledby="reports">
	<h2 id="reports">Reports <span class="sub">{data.reports.length}</span></h2>
	{#each data.reports as r (r.id)}
		<article class="card">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video src="/video/{r.videoId}/file" controls preload="metadata" playsinline></video>
			<p><b>{r.title}</b> <span class="sub">· {r.exercise} · by {r.owner}</span></p>
			<p class="reason">“{r.reason}” <span class="sub">from @{r.reporter}, {when(r.createdAt)}</span></p>
			<div class="row">
				<form method="POST" use:enhance>
					<input type="hidden" name="id" value={r.videoId} />
					<input type="hidden" name="reason" value="Reported: {r.reason}" />
					<button class="btn danger" formaction="?/remove">Remove video</button>
				</form>
				<form method="POST" use:enhance>
					<input type="hidden" name="id" value={r.id} />
					<button class="btn secondary" formaction="?/dismiss">Keep it</button>
				</form>
			</div>
		</article>
	{:else}
		<p class="sub">No reports.</p>
	{/each}
</section>

<style>
	section { margin-top: 22px; display: flex; flex-direction: column; gap: 10px; }
	h2 { font-size: 15px; }
	video { width: 100%; max-height: 50vh; border-radius: 12px; background: #000; }
	article p { margin-top: 8px; }
	.reason { color: var(--amber); }
	.row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
</style>
