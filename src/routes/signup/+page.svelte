<script lang="ts">
	let { form } = $props();
</script>

<svelte:head><title>Create account · Edgework</title></svelte:head>

<div class="auth">
	<div class="overline">Edgework</div>
	<h1>Create account</h1>
	<p class="sub">A staff member approves every new account before you can use the app.</p>
	<form method="POST">
		<label for="username">Username</label>
		<input id="username" name="username" autocomplete="username" required minlength="3" maxlength="24" value={form?.username ?? ''} />
		<label for="displayName">Name to show</label>
		<input id="displayName" name="displayName" autocomplete="nickname" required maxlength="40" value={form?.displayName ?? ''} />
		<label for="password">Password</label>
		<input id="password" name="password" type="password" autocomplete="new-password" required minlength="10" maxlength="128" />
		<p class="sub hint">At least 10 characters.</p>
		{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
		<button class="btn" type="submit">Create account</button>
	</form>
	<p class="sub">Have an account? <a href="/login">Log in</a></p>
</div>

<style>
	.auth { max-width: 420px; margin: 8vh auto 0; }
	form { margin: 18px 0; display: flex; flex-direction: column; }
	.hint { font-size: 13px; margin-top: 6px; }
	.error { margin-top: 12px; }
	.btn { margin-top: 18px; }
</style>
