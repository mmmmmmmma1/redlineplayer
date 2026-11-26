<script lang="ts">
	let { form } = $props();
</script>

<svelte:head><title>Log in · Edgework</title></svelte:head>

<div class="auth">
	<div class="overline">Edgework</div>
	<h1>Log in</h1>
	<form method="POST">
		<label for="username">Username</label>
		<input id="username" name="username" autocomplete="username" required value={form?.username ?? ''} />
		<label for="password">Password</label>
		<input id="password" name="password" type="password" autocomplete="current-password" required />
		{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
		<button class="btn" type="submit">Log in</button>
	</form>
	<p class="sub">New here? <a href="/signup">Create an account</a></p>
</div>

<style>
	.auth { max-width: 420px; margin: 8vh auto 0; }
	form { margin: 18px 0; display: flex; flex-direction: column; }
	.error { margin-top: 12px; }
	.btn { margin-top: 18px; }
</style>
