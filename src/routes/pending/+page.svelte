<script lang="ts">
	import LogoutButton from '#lib/components/LogoutButton.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Waiting for approval · Edgework</title></svelte:head>

<div class="overline">Hi {data.name}</div>
<h1>Waiting for approval</h1>
<p class="sub">A staff member needs to approve your account before you can use Edgework. Check back later.</p>
<div class="out"><LogoutButton /></div>

<style>
	p { margin-top: 10px; }
	.out { margin-top: 24px; }
</style>
