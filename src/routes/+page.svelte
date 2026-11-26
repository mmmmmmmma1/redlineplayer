<script lang="ts">
	import LogoutButton from '#lib/components/LogoutButton.svelte';
	let { data } = $props();
</script>

<div class="overline">Train smarter</div>
<h1>Edgework</h1>
<p class="sub">Workouts, exercise how-tos and videos for hockey players and track athletes.</p>
{#if data.me}
	<p><a href="/library">Open the exercise library</a></p>
	<div class="row"><LogoutButton /></div>
{:else}
	<div class="row">
		<a class="btn" href="/login">Log in</a>
		<a class="btn secondary" href="/signup">Create account</a>
	</div>
{/if}
<p class="sub credit">Edgework by Andrew (obaba-samich) &amp; Myles</p>

<style>
	p { margin-top: 10px; }
	.row { display: flex; gap: 10px; margin-top: 20px; }
	.row a { text-decoration: none; }
	.credit { font-size: 13px; margin-top: 28px; }
</style>
