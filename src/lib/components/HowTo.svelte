<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import VideoRecorder from './VideoRecorder.svelte';

	type VideoView = {
		id: string;
		title: string;
		status: 'private' | 'requested' | 'added' | 'declined' | 'removed';
		kind: 'staff' | 'player';
		declineReason: string | null;
		ownerName: string;
		mine: boolean;
	};

	let {
		exerciseId,
		exerciseName,
		videos,
		staff
	}: { exerciseId: string; exerciseName: string; videos: { staff: VideoView[]; mine: VideoView[]; community: VideoView[] }; staff: boolean } =
		$props();

	const STATUS: Record<VideoView['status'], string> = {
		private: 'Private',
		requested: 'Waiting for staff',
		added: 'Added for everyone',
		declined: 'Declined',
		removed: 'Removed'
	};

	let fileInput: HTMLInputElement | undefined = $state();
	let recorded: File | null = $state(null);
	let title = $state('');
	let ask = $state(false);
	let progress: number | null = $state(null);
	let uploadError = $state('');

	function upload(e: SubmitEvent) {
		e.preventDefault();
		uploadError = '';
		const file = recorded ?? fileInput?.files?.[0];
		if (!file) {
			uploadError = 'Choose a video first.';
			return;
		}
		const body = new FormData();
		body.set('title', title || exerciseName);
		if (ask) body.set('request', 'on');
		body.set('video', file);
		const xhr = new XMLHttpRequest();
		xhr.open('POST', `/exercise/${exerciseId}/videos`);
		xhr.responseType = 'json';
		xhr.upload.onprogress = (p) => p.lengthComputable && (progress = Math.round((p.loaded / p.total) * 100));
		xhr.onload = async () => {
			progress = null;
			const res = xhr.response as { ok?: boolean; error?: string } | null;
			if (xhr.status === 200 && res?.ok) {
				title = '';
				ask = false;
				recorded = null;
				if (fileInput) fileInput.value = '';
				await invalidateAll();
			} else {
				uploadError = res?.error ?? 'The upload went wrong. Try again.';
			}
		};
		xhr.onerror = () => {
			progress = null;
			uploadError = 'The upload went wrong. Check your connection and try again.';
		};
		progress = 0;
		xhr.send(body);
	}
</script>

{#snippet card(v: VideoView)}
	<article class="card video">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video src="/video/{v.id}/file" controls preload="metadata" playsinline></video>
		<div class="meta">
			<b>{v.title}</b>
			{#if v.mine}
				<span class="chip {v.status}">{STATUS[v.status]}</span>
				{#if v.status === 'declined' && v.declineReason}<span class="sub">Staff said: {v.declineReason}</span>{/if}
			{:else}
				<span class="sub">{v.kind === 'staff' ? 'Coach' : 'By'} {v.ownerName}</span>
			{/if}
		</div>
		{#if v.mine || staff}
			<form method="POST" use:enhance class="actions">
				<input type="hidden" name="id" value={v.id} />
				{#if v.mine && v.kind === 'player' && (v.status === 'private' || v.status === 'declined')}
					<button class="btn" formaction="?/request">Ask staff to add it</button>
				{/if}
				{#if v.mine && v.kind === 'player' && (v.status === 'requested' || v.status === 'added')}
					<button class="btn secondary" formaction="?/makePrivate">Make private</button>
				{/if}
				{#if v.mine}
					<button class="btn danger" formaction="?/delete">Delete</button>
				{/if}
			</form>
		{/if}
	</article>
{/snippet}

<h2 class="title">How-to videos</h2>

{#if videos.staff.length}
	<section aria-labelledby="coach-videos">
		<h3 id="coach-videos">Coach videos</h3>
		{#each videos.staff as v (v.id)}{@render card(v)}{/each}
	</section>
{/if}

<section aria-labelledby="your-videos">
	<h3 id="your-videos">Your videos</h3>
	{#each videos.mine as v (v.id)}{@render card(v)}{:else}
		<p class="sub">Record yourself doing it, or upload a clip. Only you can see it unless you ask staff to add it.</p>
	{/each}
</section>

{#if videos.community.length}
	<section aria-labelledby="player-videos">
		<h3 id="player-videos">Added by players</h3>
		{#each videos.community as v (v.id)}{@render card(v)}{/each}
	</section>
{/if}

<form class="card add" onsubmit={upload}>
	<h3>{staff ? 'Post a coach video' : 'Add a video'}</h3>
	{#if recorded}
		<p class="sub">Recording ready ({Math.round(recorded.size / 1024 / 1024)} MB). <button type="button" class="link" onclick={() => (recorded = null)}>Discard</button></p>
	{:else}
		<label for="video-file">Video file</label>
		<input id="video-file" bind:this={fileInput} type="file" accept="video/*" />
		<div class="or"><VideoRecorder onrecorded={(f) => (recorded = f)} /></div>
	{/if}
	<label for="video-title">Title</label>
	<input id="video-title" bind:value={title} maxlength="60" placeholder={exerciseName} />
	{#if !staff}
		<label class="check"><input type="checkbox" bind:checked={ask} /> Ask staff to add it for everyone</label>
	{/if}
	{#if uploadError}<p class="error" role="alert">{uploadError}</p>{/if}
	<button class="btn" type="submit" disabled={progress !== null}>
		{progress === null ? 'Upload' : progress < 100 ? `Uploading ${progress}%` : 'Processing…'}
	</button>
	<p class="sub small">Up to 3 minutes and 200 MB. Location and device info are removed from every video.</p>
</form>

<style>
	.title { font-size: 20px; margin: 28px 0 4px; }
	h3 { font-size: 15px; margin: 18px 2px 8px; color: var(--text2); }
	section { display: flex; flex-direction: column; gap: 10px; }
	.video video { width: 100%; max-height: 60vh; border-radius: 12px; background: #000; }
	.meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
	.chip { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 99px; background: var(--surface2); color: var(--text2); }
	.chip.requested { color: var(--amber); }
	.chip.added { color: var(--green); }
	.chip.declined { color: var(--red); }
	.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
	.actions .btn { padding: 8px 12px; font-size: 14px; }
	.add { margin-top: 18px; display: flex; flex-direction: column; }
	.add h3 { margin-top: 0; color: var(--text); }
	.or { margin-top: 10px; }
	.check { display: flex; gap: 8px; align-items: center; font-size: 15px; color: var(--text); }
	.check input { width: auto; }
	.add .btn[type='submit'] { margin-top: 14px; }
	.small { font-size: 13px; margin-top: 8px; }
	.error { margin-top: 10px; }
	.link { background: none; border: 0; color: var(--accent); font: inherit; cursor: pointer; padding: 0; }
</style>
