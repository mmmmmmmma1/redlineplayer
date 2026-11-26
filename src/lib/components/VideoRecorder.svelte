<script lang="ts">
	import { onDestroy } from 'svelte';

	let { onrecorded }: { onrecorded: (file: File) => void } = $props();

	const MAX_MS = 180_000;
	let stream: MediaStream | null = $state(null);
	let recorder: MediaRecorder | null = null;
	let recording = $state(false);
	let seconds = $state(0);
	let problem = $state('');
	let preview: HTMLVideoElement | undefined = $state();
	let timer: ReturnType<typeof setInterval> | undefined;
	let chunks: Blob[] = [];

	async function open() {
		problem = '';
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
			if (preview) preview.srcObject = stream;
		} catch {
			problem = "Couldn't open the camera. Allow camera access, or choose a file instead.";
		}
	}

	function start() {
		if (!stream) return;
		chunks = [];
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
		recorder.onstop = () => {
			const type = recorder?.mimeType || 'video/webm';
			const ext = type.includes('mp4') ? 'mp4' : 'webm';
			onrecorded(new File(chunks, `recording.${ext}`, { type }));
			close();
		};
		recorder.start(1000);
		recording = true;
		seconds = 0;
		timer = setInterval(() => {
			seconds++;
			if (seconds * 1000 >= MAX_MS) stop();
		}, 1000);
	}

	function stop() {
		clearInterval(timer);
		recording = false;
		if (recorder?.state === 'recording') recorder.stop();
	}

	function close() {
		clearInterval(timer);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		recording = false;
	}

	$effect(() => {
		if (preview && stream) preview.srcObject = stream;
	});
	onDestroy(close);
</script>

{#if !stream}
	<button type="button" class="btn secondary" onclick={open}>Record with camera</button>
{:else}
	<div class="rec">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video bind:this={preview} autoplay muted playsinline></video>
		<div class="row">
			{#if recording}
				<button type="button" class="btn danger" onclick={stop}>Stop ({seconds}s)</button>
			{:else}
				<button type="button" class="btn" onclick={start}>Start recording</button>
				<button type="button" class="btn secondary" onclick={close}>Cancel</button>
			{/if}
		</div>
	</div>
{/if}
{#if problem}<p class="sub">{problem}</p>{/if}

<style>
	.rec video { width: 100%; max-height: 50vh; border-radius: 14px; background: #000; }
	.row { display: flex; gap: 8px; margin-top: 8px; }
</style>
