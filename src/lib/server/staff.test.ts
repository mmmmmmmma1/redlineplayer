import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDb, type Db } from './db/index';
import { auditLog, users, type Role, type Status, type User } from './db/schema';
import { createSession, validateSession } from './auth/session';
import { decideUser, listAccounts, setRole } from './staff';

function add(db: Db, id: string, role: Role, status: Status): User {
	const u: User = {
		id,
		username: id,
		usernameKey: id,
		displayName: id,
		passwordHash: 'x',
		role,
		status,
		createdAt: Date.now(),
		decidedBy: null,
		decidedAt: null
	};
	db.insert(users).values(u).run();
	return u;
}
const get = (db: Db, id: string) => db.select().from(users).where(eq(users.id, id)).get()!;

function setup() {
	const db = createDb(':memory:');
	return {
		db,
		admin: add(db, 'admin', 'admin', 'active'),
		staff: add(db, 'staff', 'staff', 'active'),
		player: add(db, 'player', 'player', 'active'),
		pending: add(db, 'pending', 'player', 'pending')
	};
}

describe('staff account actions', () => {
	it('staff approves a pending user', () => {
		const { db, staff, pending } = setup();
		expect(decideUser(db, staff, pending.id, 'approve')).toEqual({ ok: true });
		const u = get(db, pending.id);
		expect(u.status).toBe('active');
		expect(u.decidedBy).toBe(staff.id);
	});

	it('staff declines a pending user', () => {
		const { db, staff, pending } = setup();
		decideUser(db, staff, pending.id, 'decline');
		expect(get(db, pending.id).status).toBe('declined');
	});

	it('players cannot decide accounts', () => {
		const { db, player, pending } = setup();
		expect(decideUser(db, player, pending.id, 'approve')).toHaveProperty('error');
		expect(get(db, pending.id).status).toBe('pending');
	});

	it('approve only works on pending accounts', () => {
		const { db, staff, player } = setup();
		expect(decideUser(db, staff, player.id, 'approve')).toHaveProperty('error');
	});

	it('suspend logs the user out', async () => {
		const { db, staff, player } = setup();
		const { token } = await createSession(db, player.id);
		decideUser(db, staff, player.id, 'suspend');
		expect(get(db, player.id).status).toBe('suspended');
		expect(await validateSession(db, token)).toBeNull();
	});

	it('restore brings back a suspended or declined account', () => {
		const { db, staff, player } = setup();
		decideUser(db, staff, player.id, 'suspend');
		decideUser(db, staff, player.id, 'restore');
		expect(get(db, player.id).status).toBe('active');
	});

	it('staff cannot suspend an admin or another staff member, admins can suspend staff', () => {
		const { db, admin, staff } = setup();
		const other = add(db, 'staff2', 'staff', 'active');
		expect(decideUser(db, staff, admin.id, 'suspend')).toHaveProperty('error');
		expect(decideUser(db, staff, other.id, 'suspend')).toHaveProperty('error');
		expect(decideUser(db, admin, other.id, 'suspend')).toEqual({ ok: true });
	});

	it('nobody can suspend themselves', () => {
		const { db, admin } = setup();
		expect(decideUser(db, admin, admin.id, 'suspend')).toHaveProperty('error');
	});
});

describe('roles', () => {
	it('staff cannot change roles', () => {
		const { db, staff, player } = setup();
		expect(setRole(db, staff, player.id, 'staff')).toHaveProperty('error');
		expect(get(db, player.id).role).toBe('player');
	});

	it('admin makes a player staff', () => {
		const { db, admin, player } = setup();
		expect(setRole(db, admin, player.id, 'staff')).toEqual({ ok: true });
		expect(get(db, player.id).role).toBe('staff');
	});

	it("admin can't remove their own admin role", () => {
		const { db, admin } = setup();
		expect(setRole(db, admin, admin.id, 'player')).toHaveProperty('error');
		expect(get(db, admin.id).role).toBe('admin');
	});
});

describe('audit', () => {
	it('every action writes an audit row', () => {
		const { db, admin, staff, player, pending } = setup();
		decideUser(db, staff, pending.id, 'approve');
		decideUser(db, staff, player.id, 'suspend');
		decideUser(db, staff, player.id, 'restore');
		setRole(db, admin, player.id, 'staff');
		const rows = db.select().from(auditLog).all();
		expect(rows.map((r) => r.action)).toEqual(['approve_user', 'suspend_user', 'restore_user', 'set_role']);
		expect(rows[3]).toMatchObject({ actorId: admin.id, targetType: 'user', targetId: player.id, detail: 'staff' });
	});

	it('failed actions write nothing', () => {
		const { db, player, pending } = setup();
		decideUser(db, player, pending.id, 'approve');
		expect(db.select().from(auditLog).all()).toHaveLength(0);
	});
});

describe('listing', () => {
	it('lists accounts by status without password hashes', () => {
		const { db } = setup();
		const l = listAccounts(db);
		expect(l.pending.map((u) => u.id)).toEqual(['pending']);
		expect(l.active).toHaveLength(3);
		expect(JSON.stringify(l)).not.toContain('passwordHash');
	});
});

describe('restoring staff', () => {
	it('only an admin can restore a suspended staff member', () => {
		const { db, admin, staff } = setup();
		const other = add(db, 'staff3', 'staff', 'active');
		decideUser(db, admin, other.id, 'suspend');
		expect(decideUser(db, staff, other.id, 'restore')).toHaveProperty('error');
		expect(get(db, other.id).status).toBe('suspended');
		expect(decideUser(db, admin, other.id, 'restore')).toEqual({ ok: true });
	});
});
