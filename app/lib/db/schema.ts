import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull().default(''),
  googleId: varchar('google_id', { length: 255 }).unique(),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  avatar: varchar('avatar', { length: 100 }),
  activatedApps: jsonb('activated_apps').notNull().default('[]'),
  deletedAt: timestamp('deleted_at'),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  userTeamIdx: uniqueIndex('team_members_user_team_idx').on(table.userId, table.teamId),
}));

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
}, (table) => ({
  userIdx: index('activity_logs_user_idx').on(table.userId),
  teamIdx: index('activity_logs_team_idx').on(table.teamId),
}));

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

// ============================================================
// SOCIAL FEED MODULE
// ============================================================

export const feedPosts = pgTable('feed_posts', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull().default('system_activity'),
  message: text('message').notNull(),
  likes: integer('likes').notNull().default(0),
  mentions: jsonb('mentions'),
  attachments: jsonb('attachments'),
  appId: varchar('app_id', { length: 50 }),
  resultPreview: text('result_preview'),
  resultMetrics: jsonb('result_metrics'),
  taskTitle: varchar('task_title', { length: 255 }),
  taskStatus: varchar('task_status', { length: 30 }),
  taskAssignee: varchar('task_assignee', { length: 100 }),
  taskDueDate: varchar('task_due_date', { length: 50 }),
  pinned: integer('pinned').notNull().default(0),
  pinnedBy: varchar('pinned_by', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  teamIdx: index('feed_posts_team_idx').on(table.teamId),
  createdAtIdx: index('feed_posts_created_at_idx').on(table.createdAt),
}));

export const feedComments = pgTable('feed_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: varchar('user_name', { length: 100 }).notNull(),
  userAvatar: varchar('user_avatar', { length: 50 }).notNull().default('👤'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedLikes = pgTable('feed_likes', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  postUserIdx: uniqueIndex('feed_likes_post_user_idx').on(table.postId, table.userId),
}));

export const feedPostsRelations = relations(feedPosts, ({ one, many }) => ({
  team: one(teams, { fields: [feedPosts.teamId], references: [teams.id] }),
  user: one(users, { fields: [feedPosts.userId], references: [users.id] }),
  comments: many(feedComments),
  likesList: many(feedLikes),
}));

export const feedCommentsRelations = relations(feedComments, ({ one }) => ({
  post: one(feedPosts, { fields: [feedComments.postId], references: [feedPosts.id] }),
  user: one(users, { fields: [feedComments.userId], references: [users.id] }),
}));

export const feedLikesRelations = relations(feedLikes, ({ one }) => ({
  post: one(feedPosts, { fields: [feedLikes.postId], references: [feedPosts.id] }),
  user: one(users, { fields: [feedLikes.userId], references: [users.id] }),
}));

export type FeedPostDB = typeof feedPosts.$inferSelect;
export type NewFeedPostDB = typeof feedPosts.$inferInsert;
export type FeedCommentDB = typeof feedComments.$inferSelect;
export type NewFeedCommentDB = typeof feedComments.$inferInsert;
export type FeedLikeDB = typeof feedLikes.$inferSelect;
export type NewFeedLikeDB = typeof feedLikes.$inferInsert;

// ============================================================
// SYSTEM ANNOUNCEMENTS & NOTIFICATIONS MODULE
// ============================================================

export const systemAnnouncements = pgTable('system_announcements', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  version: varchar('version', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('info'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userAnnouncementReads = pgTable('user_announcement_reads', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  announcementId: integer('announcement_id')
    .notNull()
    .references(() => systemAnnouncements.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at').notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fromUserId: integer('from_user_id').references(() => users.id, { onDelete: 'set null' }),
  fromUserName: varchar('from_user_name', { length: 100 }),
  fromUserAvatar: varchar('from_user_avatar', { length: 50 }).default('👤'),
  message: text('message').notNull(),
  postId: integer('post_id').references(() => feedPosts.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }),
  invitationId: integer('invitation_id').references(() => invitations.id, { onDelete: 'cascade' }),
  read: integer('read').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
}));

export const systemAnnouncementsRelations = relations(systemAnnouncements, ({ one, many }) => ({
  creator: one(users, { fields: [systemAnnouncements.createdBy], references: [users.id] }),
  reads: many(userAnnouncementReads),
}));

export const userAnnouncementReadsRelations = relations(userAnnouncementReads, ({ one }) => ({
  user: one(users, { fields: [userAnnouncementReads.userId], references: [users.id] }),
  announcement: one(systemAnnouncements, { fields: [userAnnouncementReads.announcementId], references: [systemAnnouncements.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  sender: one(users, { fields: [notifications.fromUserId], references: [users.id] }),
  post: one(feedPosts, { fields: [notifications.postId], references: [feedPosts.id] }),
  invitation: one(invitations, { fields: [notifications.invitationId], references: [invitations.id] }),
}));

export type SystemAnnouncement = typeof systemAnnouncements.$inferSelect;
export type NewSystemAnnouncement = typeof systemAnnouncements.$inferInsert;
export type UserAnnouncementRead = typeof userAnnouncementReads.$inferSelect;
export type NewUserAnnouncementRead = typeof userAnnouncementReads.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ============================================================
// SIM MANAGER MODULE — SimGuard Integration
// ============================================================

export const simEmployees = pgTable('sim_employees', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  department: varchar('department', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  leftAt: timestamp('left_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const simAssets = pgTable('sim_assets', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  value: text('value').notNull(),
  importanceLevel: varchar('importance_level', { length: 20 }).notNull().default('medium'),
  ownerEmployeeId: integer('owner_employee_id').references(() => simEmployees.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  riskScore: integer('risk_score').notNull().default(0),
  lastCheckedAt: timestamp('last_checked_at'),
  activationDate: timestamp('activation_date'),
  carrier: varchar('carrier', { length: 50 }),
  lineType: varchar('line_type', { length: 20 }).default('mobile'),
  numverifyValid: integer('numverify_valid').default(1),
  registeredName: text('registered_name'),
  registeredId: text('registered_id'),
  registeredAt: timestamp('registered_at'),
  topupCycleDays: integer('topup_cycle_days').default(90),
  lastTopupAt: timestamp('last_topup_at'),
  renewalDate: timestamp('renewal_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const simPlatforms = pgTable('sim_platforms', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 10 }).default('🔗'),
  color: varchar('color', { length: 20 }).default('#6366F1'),
  isDefault: integer('is_default').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const simLinkedAccounts = pgTable('sim_linked_accounts', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  platformKey: varchar('platform_key', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 100 }).notNull(),
  loginUrl: text('login_url'),
  username: varchar('username', { length: 150 }),
  encryptedPassword: text('encrypted_password'),
  notes: text('notes'),
  loginEmail: varchar('login_email', { length: 255 }),
  linkedPhoneAssetId: integer('linked_phone_asset_id').references(() => simAssets.id, { onDelete: 'restrict' }),
  backupEmail: varchar('backup_email', { length: 255 }),
  backupPhoneAssetId: integer('backup_phone_asset_id').references(() => simAssets.id, { onDelete: 'set null' }),
  ownerEmployeeId: integer('owner_employee_id').references(() => simEmployees.id, { onDelete: 'set null' }),
  importanceLevel: varchar('importance_level', { length: 20 }).notNull().default('medium'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const simRiskEvents = pgTable('sim_risk_events', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id').notNull().references(() => simAssets.id, { onDelete: 'cascade' }),
  riskType: varchar('risk_type', { length: 50 }).notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull().default('medium'),
  message: text('message').notNull(),
  resolved: integer('resolved').default(0),
  resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  resolveNote: text('resolve_note'),
  dismissed: integer('dismissed').default(0),
  dismissedAt: timestamp('dismissed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const simCheckLogs = pgTable('sim_check_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id').notNull().references(() => simAssets.id, { onDelete: 'cascade' }),
  checkedBy: integer('checked_by').references(() => users.id, { onDelete: 'set null' }),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
  checkType: varchar('check_type', { length: 20 }).default('manual'),
  riskScoreBefore: integer('risk_score_before').default(0),
  riskScoreAfter: integer('risk_score_after').default(0),
  notes: text('notes'),
  statusAfter: varchar('status_after', { length: 20 }).default('safe'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- SIM Module Relations ---
export const simEmployeesRelations = relations(simEmployees, ({ one, many }) => ({
  team: one(teams, { fields: [simEmployees.teamId], references: [teams.id] }),
  user: one(users, { fields: [simEmployees.userId], references: [users.id] }),
  assets: many(simAssets),
  linkedAccounts: many(simLinkedAccounts),
}));

export const simAssetsRelations = relations(simAssets, ({ one, many }) => ({
  team: one(teams, { fields: [simAssets.teamId], references: [teams.id] }),
  owner: one(simEmployees, { fields: [simAssets.ownerEmployeeId], references: [simEmployees.id] }),
  linkedAccounts: many(simLinkedAccounts),
  riskEvents: many(simRiskEvents),
  checkLogs: many(simCheckLogs),
}));

export const simLinkedAccountsRelations = relations(simLinkedAccounts, ({ one }) => ({
  team: one(teams, { fields: [simLinkedAccounts.teamId], references: [teams.id] }),
  asset: one(simAssets, { fields: [simLinkedAccounts.linkedPhoneAssetId], references: [simAssets.id] }),
  backupAsset: one(simAssets, { fields: [simLinkedAccounts.backupPhoneAssetId], references: [simAssets.id] }),
  owner: one(simEmployees, { fields: [simLinkedAccounts.ownerEmployeeId], references: [simEmployees.id] }),
}));

export const simRiskEventsRelations = relations(simRiskEvents, ({ one }) => ({
  team: one(teams, { fields: [simRiskEvents.teamId], references: [teams.id] }),
  asset: one(simAssets, { fields: [simRiskEvents.assetId], references: [simAssets.id] }),
  resolver: one(users, { fields: [simRiskEvents.resolvedBy], references: [users.id] }),
}));

export const simCheckLogsRelations = relations(simCheckLogs, ({ one }) => ({
  team: one(teams, { fields: [simCheckLogs.teamId], references: [teams.id] }),
  asset: one(simAssets, { fields: [simCheckLogs.assetId], references: [simAssets.id] }),
  checker: one(users, { fields: [simCheckLogs.checkedBy], references: [users.id] }),
}));

export const simBackupConfigs = pgTable('sim_backup_configs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  backupEmail: varchar('backup_email', { length: 255 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull().default('monthly'), // 'weekly' | 'monthly' | 'off'
  lastSentAt: timestamp('last_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// --- SIM Module Relations ---
export const simBackupConfigsRelations = relations(simBackupConfigs, ({ one }) => ({
  team: one(teams, { fields: [simBackupConfigs.teamId], references: [teams.id] }),
}));

// --- SIM Module Types ---
export type SimEmployee = typeof simEmployees.$inferSelect;
export type NewSimEmployee = typeof simEmployees.$inferInsert;
export type SimAsset = typeof simAssets.$inferSelect;
export type NewSimAsset = typeof simAssets.$inferInsert;
export type SimPlatform = typeof simPlatforms.$inferSelect;
export type NewSimPlatform = typeof simPlatforms.$inferInsert;
export type SimLinkedAccount = typeof simLinkedAccounts.$inferSelect;
export type NewSimLinkedAccount = typeof simLinkedAccounts.$inferInsert;
export type SimRiskEvent = typeof simRiskEvents.$inferSelect;
export type NewSimRiskEvent = typeof simRiskEvents.$inferInsert;
export type SimCheckLog = typeof simCheckLogs.$inferSelect;
export type NewSimCheckLog = typeof simCheckLogs.$inferInsert;
export type SimBackupConfig = typeof simBackupConfigs.$inferSelect;
export type NewSimBackupConfig = typeof simBackupConfigs.$inferInsert;

// ============================================================
// HEROSIM EXTENSION MODULE
// ============================================================

export const extensionTokens = pgTable('extension_tokens', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  createdByUserId: integer('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(), // SHA-256 hash of JWT — KHÔNG lưu token gốc
  deviceName: varchar('device_name', { length: 100 }).default('Chrome Extension'),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const extensionLinkCodes = pgTable('extension_link_codes', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 8 }).notNull(), // 6-8 ký tự ngẫu nhiên
  expiresAt: timestamp('expires_at').notNull(), // Hết hạn sau 5 phút
  usedAt: timestamp('used_at'), // null = chưa dùng
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- HeroSim Extension Relations ---
export const extensionTokensRelations = relations(extensionTokens, ({ one }) => ({
  team: one(teams, { fields: [extensionTokens.teamId], references: [teams.id] }),
  creator: one(users, { fields: [extensionTokens.createdByUserId], references: [users.id] }),
}));

export const extensionLinkCodesRelations = relations(extensionLinkCodes, ({ one }) => ({
  team: one(teams, { fields: [extensionLinkCodes.teamId], references: [teams.id] }),
  user: one(users, { fields: [extensionLinkCodes.userId], references: [users.id] }),
}));

// --- HeroSim Extension Types ---
export type ExtensionToken = typeof extensionTokens.$inferSelect;
export type NewExtensionToken = typeof extensionTokens.$inferInsert;
export type ExtensionLinkCode = typeof extensionLinkCodes.$inferSelect;
export type NewExtensionLinkCode = typeof extensionLinkCodes.$inferInsert;

// ============================================================
// HEROVIDEO MVP MODULE
// ============================================================

export const videoAssets = pgTable('video_assets', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url').notNull(),
  size: varchar('size', { length: 50 }),
  mimeType: varchar('mime_type', { length: 100 }),
  thumbnailUrl: text('thumbnail_url'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const videoAssetsRelations = relations(videoAssets, ({ one }) => ({
  team: one(teams, { fields: [videoAssets.teamId], references: [teams.id] }),
  user: one(users, { fields: [videoAssets.userId], references: [users.id] }),
}));

export type VideoAsset = typeof videoAssets.$inferSelect;
export type NewVideoAsset = typeof videoAssets.$inferInsert;

// ============================================================
// CONNECT HUB MVP MODULE
// ============================================================

export const connectHubConnections = pgTable('connect_hub_connections', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  appSlug: varchar('app_slug', { length: 100 }).notNull(),
  appName: varchar('app_name', { length: 255 }).notNull(),
  connectionName: varchar('connection_name', { length: 255 }).notNull(),
  authType: varchar('auth_type', { length: 50 }).notNull(),
  // Credential mã hóa AES-256-GCM — KHÔNG BAO GIỜ lưu plaintext
  encryptedCredentials: text('encrypted_credentials').notNull(),
  status: varchar('status', { length: 50 }).default('connected').notNull(),
  usedByModules: jsonb('used_by_modules').default('[]'),
  lastTestedAt: timestamp('last_tested_at'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectHubUsageLogs = pgTable('connect_hub_usage_logs', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').notNull().references(() => connectHubConnections.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  callerModule: varchar('caller_module', { length: 100 }),
  appSlug: varchar('app_slug', { length: 100 }),
  actionName: varchar('action_name', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  isTest: integer('is_test').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Relations ---
export const connectHubConnectionsRelations = relations(connectHubConnections, ({ one, many }) => ({
  team: one(teams, { fields: [connectHubConnections.teamId], references: [teams.id] }),
  user: one(users, { fields: [connectHubConnections.userId], references: [users.id] }),
  usageLogs: many(connectHubUsageLogs),
}));

export const connectHubUsageLogsRelations = relations(connectHubUsageLogs, ({ one }) => ({
  team: one(teams, { fields: [connectHubUsageLogs.teamId], references: [teams.id] }),
  connection: one(connectHubConnections, { fields: [connectHubUsageLogs.connectionId], references: [connectHubConnections.id] }),
}));

// --- Types ---
export type ConnectHubConnection = typeof connectHubConnections.$inferSelect;
export type NewConnectHubConnection = typeof connectHubConnections.$inferInsert;
export type ConnectHubUsageLog = typeof connectHubUsageLogs.$inferSelect;
export type NewConnectHubUsageLog = typeof connectHubUsageLogs.$inferInsert;

export const connectHubMappingConfigs = pgTable('connect_hub_mapping_configs', {
  id: serial('id').primaryKey(),
  appSlug: varchar('app_slug', { length: 100 }).notNull(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  appTeamIdx: uniqueIndex('connect_hub_mapping_configs_app_team_idx').on(table.appSlug, table.teamId),
}));

export const connectHubMappingConfigsRelations = relations(connectHubMappingConfigs, ({ one }) => ({
  team: one(teams, { fields: [connectHubMappingConfigs.teamId], references: [teams.id] }),
}));

export type ConnectHubMappingConfig = typeof connectHubMappingConfigs.$inferSelect;
export type NewConnectHubMappingConfig = typeof connectHubMappingConfigs.$inferInsert;

// ============================================================
// CONNECT HUB WEBHOOKS MODULE
// ============================================================

export const connectHubWebhooks = pgTable('connect_hub_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  appSlug: varchar('app_slug', { length: 100 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  secretHash: text('secret_hash').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'paused'
  receivedCount: integer('received_count').notNull().default(0),
  lastReceivedAt: timestamp('last_received_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectHubWebhookLogs = pgTable('connect_hub_webhook_logs', {
  id: serial('id').primaryKey(),
  webhookId: uuid('webhook_id')
    .notNull()
    .references(() => connectHubWebhooks.id, { onDelete: 'cascade' }),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 10 }).notNull(),
  sourceIp: varchar('source_ip', { length: 45 }),
  headers: jsonb('headers').notNull().default('{}'),
  rawBody: text('raw_body'),
  parsedPayload: jsonb('parsed_payload'),
  signatureValid: integer('signature_valid').notNull().default(0), // 1 = valid, 0 = invalid
  status: varchar('status', { length: 20 }).notNull().default('success'), // 'success' | 'failed'
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

export const connectHubWebhooksRelations = relations(connectHubWebhooks, ({ one, many }) => ({
  team: one(teams, { fields: [connectHubWebhooks.teamId], references: [teams.id] }),
  logs: many(connectHubWebhookLogs),
}));

export const connectHubWebhookLogsRelations = relations(connectHubWebhookLogs, ({ one }) => ({
  webhook: one(connectHubWebhooks, { fields: [connectHubWebhookLogs.webhookId], references: [connectHubWebhooks.id] }),
  team: one(teams, { fields: [connectHubWebhookLogs.teamId], references: [teams.id] }),
}));

export type ConnectHubWebhook = typeof connectHubWebhooks.$inferSelect;
export type NewConnectHubWebhook = typeof connectHubWebhooks.$inferInsert;
export type ConnectHubWebhookLog = typeof connectHubWebhookLogs.$inferSelect;
export type NewConnectHubWebhookLog = typeof connectHubWebhookLogs.$inferInsert;

// ============================================================================
// HERO REPORT — MVP Báo cáo tự động (V1: POS → Code Aggregator → AI nhận xét → Telegram)
// ============================================================================

/**
 * Bảng cấu hình lịch báo cáo.
 * Mỗi schedule = 1 báo cáo tự động: nguồn đầu vào + reportSpec + đích đến + lịch chạy.
 * 
 * reportSpec (jsonb) chứa cấu hình chuẩn hóa thay vì prompt tự do:
 * {
 *   reportType: "daily_sales" | "low_stock" | "pending_orders" | "top_products",
 *   dateRange: "yesterday" | "today" | "last_7_days",
 *   metrics: ["total_revenue", "total_orders", "top_products", "low_stock"],
 *   filters: { lowStockLessThan: 10, topN: 5 },
 *   aiSummaryStyle: "short_business" | "detailed" | "alert_only",
 *   customPrompt: "Nhấn mạnh sản phẩm bán chạy..." // yêu cầu thêm tùy chọn
 * }
 */
export const heroReportSchedules = pgTable('hero_report_schedules', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // status: 'active' | 'paused'

  // --- Input Source ---
  inputConnectionId: integer('input_connection_id').notNull()
    .references(() => connectHubConnections.id, { onDelete: 'cascade' }),
  inputProvider: varchar('input_provider', { length: 50 }).notNull(),
  // inputProvider: 'pancake-pos' | 'kiotviet'
  inputSources: jsonb('input_sources').default('[]'),

  // --- Report Spec (JSON chuẩn, KHÔNG prompt tự do) ---
  reportSpec: jsonb('report_spec').notNull().default('{}'),

  // --- Output (V1: chỉ Telegram) ---
  outputType: varchar('output_type', { length: 50 }).notNull().default('telegram'),
  outputConnectionId: integer('output_connection_id').notNull()
    .references(() => connectHubConnections.id, { onDelete: 'cascade' }),
  outputConfig: jsonb('output_config').notNull().default('{}'),
  // outputConfig: { chatId: "-100123456789" }

  // --- Scheduler & Cron Lock ---
  scheduleType: varchar('schedule_type', { length: 20 }).notNull().default('manual'),
  // scheduleType: 'manual' | 'daily' | 'hourly' | 'weekly'
  cronExpression: varchar('cron_expression', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Ho_Chi_Minh'),
  nextRunAt: timestamp('next_run_at'),
  lastRunAt: timestamp('last_run_at'),
  lastSuccessAt: timestamp('last_success_at'),
  lockedAt: timestamp('locked_at'),   // Chống chạy trùng cron
  lockedBy: varchar('locked_by', { length: 100 }), // ID tiến trình đang lock

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Bảng lịch sử chạy báo cáo.
 * Mỗi run = 1 lần hệ thống thực thi báo cáo (thủ công hoặc cron).
 * Lưu snapshot metrics + nội dung AI + token consumed để kiểm soát chi phí.
 */
export const heroReportRuns = pgTable('hero_report_runs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  scheduleId: integer('schedule_id').notNull()
    .references(() => heroReportSchedules.id, { onDelete: 'cascade' }),

  status: varchar('status', { length: 20 }).notNull().default('running'),
  // status: 'running' | 'success' | 'failed'
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),

  // --- Data snapshot ---
  metricsJson: jsonb('metrics_json'),   // Số liệu aggregated bằng code
  reportText: text('report_text'),       // Nội dung báo cáo AI viết

  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),

  // --- AI cost tracking ---
  aiModel: varchar('ai_model', { length: 100 }),
  aiInputTokens: integer('ai_input_tokens'),
  aiOutputTokens: integer('ai_output_tokens'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Hero Report Relations ---
export const heroReportSchedulesRelations = relations(heroReportSchedules, ({ one, many }) => ({
  team: one(teams, { fields: [heroReportSchedules.teamId], references: [teams.id] }),
  user: one(users, { fields: [heroReportSchedules.userId], references: [users.id] }),
  inputConnection: one(connectHubConnections, { fields: [heroReportSchedules.inputConnectionId], references: [connectHubConnections.id] }),
  outputConnection: one(connectHubConnections, { fields: [heroReportSchedules.outputConnectionId], references: [connectHubConnections.id] }),
  runs: many(heroReportRuns),
}));

export const heroReportRunsRelations = relations(heroReportRuns, ({ one }) => ({
  team: one(teams, { fields: [heroReportRuns.teamId], references: [teams.id] }),
  schedule: one(heroReportSchedules, { fields: [heroReportRuns.scheduleId], references: [heroReportSchedules.id] }),
}));

// --- Hero Report Types ---
export type HeroReportSchedule = typeof heroReportSchedules.$inferSelect;
export type NewHeroReportSchedule = typeof heroReportSchedules.$inferInsert;
export type HeroReportRun = typeof heroReportRuns.$inferSelect;
export type NewHeroReportRun = typeof heroReportRuns.$inferInsert;

