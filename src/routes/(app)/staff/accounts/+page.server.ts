import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb } from '#lib/server/db/index.js';
import { requireStaff } from '#lib/server/guard.js';
import { decideUser, listAccounts, setRole, type Decision } from '#lib/server/staff.js';
import { ROLES, type Role } from '#lib/server/db/schema.js';

export const load: PageServerLoad = (event) => {
	const me = requireStaff(event);
	return { accounts: listAccounts(getDb()), meId: me.id, isAdmin: me.role === 'admin' };
};

const decision = (name: Decision) => async (event: Parameters<Actions[string]>[0]) => {
	const me = requireStaff(event);
	const id = String((await event.request.formData()).get('id') ?? '');
	const r = decideUser(getDb(), me, id, name);
	if ('error' in r) return fail(400, { error: r.error });
	return { ok: true };
};

export const actions: Actions = {
	approve: decision('approve'),
	decline: decision('decline'),
	suspend: decision('suspend'),
	restore: decision('restore'),
	role: async (event) => {
		const me = requireStaff(event);
		const f = await event.request.formData();
		const role = String(f.get('role') ?? '') as Role;
		if (!ROLES.includes(role)) return fail(400, { error: 'Unknown role.' });
		const r = setRole(getDb(), me, String(f.get('id') ?? ''), role);
		if ('error' in r) return fail(400, { error: r.error });
		return { ok: true };
	}
};
