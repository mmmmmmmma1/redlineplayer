<script lang="ts">
	import LogoutButton from '#lib/components/LogoutButton.svelte';
	let { data } = $props();
	const roles = { player: 'Player', staff: 'Staff', admin: 'Admin' } as const;
</script>

<svelte:head><title>Profile · Edgework</title></svelte:head>

<div class="overline">Profile</div>
<h1>{data.displayName}</h1>
<p class="sub">@{data.username} · {roles[data.role]} · joined {new Date(data.since).toLocaleDateString()}</p>

<div class="out"><LogoutButton /></div>

<section class="card credits" aria-labelledby="credits-title">
	<h2 id="credits-title">Credits</h2>
	<p><b>Edgework</b> is made by <b>Andrew (obaba-samich)</b> &amp; <b>Myles</b>.</p>
	<ul class="sub">
		<li>Andrew: the Edgework training app, its workouts, exercise library and look.</li>
		<li>Myles: Redline Player, where the exercise video idea comes from.</li>
	</ul>
</section>

<style>
	.out { margin: 18px 0; }
	h2 { font-size: 15px; margin-bottom: 8px; }
	ul { margin-top: 8px; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
</style>
