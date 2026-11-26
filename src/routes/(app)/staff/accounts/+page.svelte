<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const sections = [
		['pending', 'Waiting for approval'],
		['active', 'Active'],
		['suspended', 'Suspended'],
		['declined', 'Declined']
	] as const;
	const date = (t: number) => new Date(t).toLocaleDateString();
</script>

<svelte:head><title>Accounts · Edgework</title></svelte:head>

<div class="overline">Staff</div>
<h1>Accounts</h1>
{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}

{#each sections as [status, title]}
	{@const list = data.accounts[status]}
	<h2>{title} <span class="sub">{list.length}</span></h2>
	{#if list.length === 0}
		<p class="sub">None.</p>
	{:else}
		<ul>
			{#each list as a (a.id)}
				<li class="card">
					<div class="who">
						<b>{a.displayName}</b>
						<span class="sub">@{a.username} · {a.role} · joined {date(a.createdAt)}</span>
					</div>
					{#if a.id !== data.meId}
						<form method="POST" use:enhance>
							<input type="hidden" name="id" value={a.id} />
							{#if status === 'pending'}
								<button class="btn" formaction="?/approve">Approve</button>
								<button class="btn secondary" formaction="?/decline">Decline</button>
							{:else if status === 'active'}
								{#if data.isAdmin}
									<select name="role" aria-label="Role for {a.username}" value={a.role}>
										<option value="player">Player</option>
										<option value="staff">Staff</option>
										<option value="admin">Admin</option>
									</select>
									<button class="btn secondary" formaction="?/role">Set role</button>
								{/if}
								{#if a.role === 'player' || data.isAdmin}
									<button class="btn danger" formaction="?/suspend">Suspend</button>
								{/if}
							{:else}
								<button class="btn secondary" formaction="?/restore">Restore</button>
							{/if}
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/each}

<style>
	h2 { font-size: 15px; margin: 26px 2px 10px; }
	ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
	li { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
	.who { display: flex; flex-direction: column; }
	form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
	select { width: auto; }
	.error { margin-top: 12px; }
</style>
