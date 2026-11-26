import type { PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { getDb } from '#lib/server/db/index.js';
import { auditLog, users } from '#lib/server/db/schema.js';
import { requireStaff } from '#lib/server/guard.js';

export const load: PageServerLoad = (event) => {
	requireStaff(event);
	const target = alias(users, 'target');
	const rows = getDb()
		.select({
			id: auditLog.id,
			action: auditLog.action,
			targetType: auditLog.targetType,
			detail: auditLog.detail,
			createdAt: auditLog.createdAt,
			actor: users.username,
			actorId: auditLog.actorId,
			target: target.username
		})
		.from(auditLog)
		.leftJoin(users, eq(users.id, auditLog.actorId))
		.leftJoin(target, eq(target.id, auditLog.targetId))
		.orderBy(desc(auditLog.createdAt))
		.limit(200)
		.all();
	return { rows };
};
