import { eq } from 'drizzle-orm';
import type { Db } from './db/index';
import { users, type Role, type User } from './db/schema';
import { audit } from './audit';
import { invalidateUserSessions } from './auth/session';
import { canManageRoles, isStaff } from './permissions';

export type Result = { ok: true } | { error: string };
export type Decision = 'approve' | 'decline' | 'suspend' | 'restore';
export type AccountRow = Pick<User, 'id' | 'username' | 'displayName' | 'role' | 'status' | 'createdAt'>;

const FROM: Record<Decision, User['status'][]> = {
	approve: ['pending'],
	decline: ['pending'],
	suspend: ['active'],
	restore: ['suspended', 'declined']
};
const TO = { approve: 'active', decline: 'declined', suspend: 'suspended', restore: 'active' } as const;

/** Approve, decline, suspend or restore an account. Suspending also logs the person out everywhere. */
export function decideUser(db: Db, actor: User, targetId: string, decision: Decision): Result {
	if (!isStaff(actor)) return { error: 'Staff only.' };
	const target = db.select().from(users).where(eq(users.id, targetId)).get();
	if (!target) return { error: 'No such account.' };
	if (target.id === actor.id) return { error: "You can't change your own account here." };
	if (!FROM[decision].includes(target.status)) return { error: 'That account has changed. Reload the page.' };
	if (decision === 'suspend' && target.role !== 'player' && actor.role !== 'admin') {
		return { error: 'Only an admin can suspend staff.' };
	}
	db.update(users)
		.set({ status: TO[decision], decidedBy: actor.id, decidedAt: Date.now() })
		.where(eq(users.id, targetId))
		.run();
	if (decision === 'suspend') invalidateUserSessions(db, targetId);
	audit(db, actor, `${decision}_user`, 'user', targetId);
	return { ok: true };
}

export function setRole(db: Db, actor: User, targetId: string, role: Role): Result {
	if (!canManageRoles(actor)) return { error: 'Only admins can change roles.' };
	if (targetId === actor.id) return { error: "You can't change your own role." };
	const target = db.select().from(users).where(eq(users.id, targetId)).get();
	if (!target) return { error: 'No such account.' };
	db.update(users).set({ role }).where(eq(users.id, targetId)).run();
	audit(db, actor, 'set_role', 'user', targetId, role);
	return { ok: true };
}

export function listAccounts(db: Db): Record<User['status'], AccountRow[]> {
	const rows = db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			role: users.role,
			status: users.status,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(users.createdAt)
		.all();
	const out: Record<User['status'], AccountRow[]> = { pending: [], active: [], suspended: [], declined: [] };
	for (const r of rows) out[r.status].push(r);
	return out;
}
