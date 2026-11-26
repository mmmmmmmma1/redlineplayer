import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const ROLES = ['player', 'staff', 'admin'] as const;
export const STATUSES = ['pending', 'active', 'declined', 'suspended'] as const;
export const VIDEO_KINDS = ['staff', 'player'] as const;
export const VIDEO_STATUSES = ['private', 'requested', 'added', 'declined', 'removed'] as const;

export type Role = (typeof ROLES)[number];
export type Status = (typeof STATUSES)[number];
export type VideoKind = (typeof VIDEO_KINDS)[number];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull(),
	usernameKey: text('username_key').notNull().unique(),
	displayName: text('display_name').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ROLES }).notNull().default('player'),
	status: text('status', { enum: STATUSES }).notNull().default('pending'),
	createdAt: integer('created_at').notNull(),
	decidedBy: text('decided_by'),
	decidedAt: integer('decided_at')
});

export const sessions = sqliteTable(
	'sessions',
	{
		idHash: text('id_hash').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at').notNull()
	},
	(t) => [index('sessions_user').on(t.userId)]
);

export const videos = sqliteTable(
	'videos',
	{
		id: text('id').primaryKey(),
		ownerId: text('owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		exerciseId: text('exercise_id').notNull(),
		kind: text('kind', { enum: VIDEO_KINDS }).notNull(),
		status: text('status', { enum: VIDEO_STATUSES }).notNull(),
		title: text('title').notNull(),
		declineReason: text('decline_reason'),
		file: text('file').notNull(),
		durationS: real('duration_s').notNull(),
		createdAt: integer('created_at').notNull(),
		reviewedBy: text('reviewed_by'),
		reviewedAt: integer('reviewed_at')
	},
	(t) => [index('videos_exercise').on(t.exerciseId), index('videos_status').on(t.status)]
);

export const reports = sqliteTable(
	'reports',
	{
		id: text('id').primaryKey(),
		videoId: text('video_id')
			.notNull()
			.references(() => videos.id, { onDelete: 'cascade' }),
		reporterId: text('reporter_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		reason: text('reason').notNull(),
		createdAt: integer('created_at').notNull(),
		resolvedBy: text('resolved_by'),
		resolvedAt: integer('resolved_at')
	},
	(t) => [index('reports_video').on(t.videoId)]
);

export const auditLog = sqliteTable('audit_log', {
	id: text('id').primaryKey(),
	actorId: text('actor_id').notNull(),
	action: text('action').notNull(),
	targetType: text('target_type').notNull(),
	targetId: text('target_id').notNull(),
	detail: text('detail'),
	createdAt: integer('created_at').notNull()
});

export const userData = sqliteTable('user_data', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	json: text('json').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Report = typeof reports.$inferSelect;
