import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  uuid,
  boolean,
  primaryKey,
  real,
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
  balance: integer('balance').notNull().default(0),
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

export const usersRelations = relations(users, ({ one, many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  socialProfile: one(socialProfiles),
  friendsRequested: many(socialFriends, { relationName: 'requester' }),
  friendsReceived: many(socialFriends, { relationName: 'addressee' }),
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
  visibility: varchar('visibility', { length: 20 }).default('public'),
  status: varchar('status', { length: 20 }).notNull().default('approved'), // pending | approved | rejected
  groupId: integer('group_id').references(() => socialGroups.id, { onDelete: 'set null' }),
  pageId: integer('page_id').references(() => socialPages.id, { onDelete: 'set null' }),
  sharedPostId: integer('shared_post_id'),
  linkPreview: jsonb('link_preview'),
  syncWebsite: integer('sync_website').notNull().default(0), // 0: false, 1: true
  websiteCategory: varchar('website_category', { length: 100 }),
  taggedProducts: jsonb('tagged_products'),
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
  parentId: integer('parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedLikes = pgTable('feed_likes', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reactionType: varchar('reaction_type', { length: 20 }).default('like'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  postUserIdx: uniqueIndex('feed_likes_post_user_idx').on(table.postId, table.userId),
}));

export const feedBookmarks = pgTable('feed_bookmarks', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  bookmarkPostUserIdx: uniqueIndex('feed_bookmarks_post_user_idx').on(table.postId, table.userId),
}));

export const feedStories = pgTable('feed_stories', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url'),
  textContent: text('text_content'),
  bgClass: varchar('bg_class', { length: 50 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  storyTeamIdx: index('feed_stories_team_idx').on(table.teamId),
  storyExpiresIdx: index('feed_stories_expires_idx').on(table.expiresAt),
}));

export const feedPostsRelations = relations(feedPosts, ({ one, many }) => ({
  team: one(teams, { fields: [feedPosts.teamId], references: [teams.id] }),
  user: one(users, { fields: [feedPosts.userId], references: [users.id] }),
  comments: many(feedComments),
  likesList: many(feedLikes),
  bookmarks: many(feedBookmarks),
  group: one(socialGroups, { fields: [feedPosts.groupId], references: [socialGroups.id] }),
  page: one(socialPages, { fields: [feedPosts.pageId], references: [socialPages.id] }),
  media: many(postMedia),
  sharedPost: one(feedPosts, {
    fields: [feedPosts.sharedPostId],
    references: [feedPosts.id],
    relationName: 'post_shares',
  }),
  shares: many(feedPosts, { relationName: 'post_shares' }),
}));

export const feedStoriesRelations = relations(feedStories, ({ one }) => ({
  team: one(teams, { fields: [feedStories.teamId], references: [teams.id] }),
  user: one(users, { fields: [feedStories.userId], references: [users.id] }),
}));

export const feedCommentsRelations = relations(feedComments, ({ one, many }) => ({
  post: one(feedPosts, { fields: [feedComments.postId], references: [feedPosts.id] }),
  user: one(users, { fields: [feedComments.userId], references: [users.id] }),
  parent: one(feedComments, {
    fields: [feedComments.parentId],
    references: [feedComments.id],
    relationName: 'comment_replies',
  }),
  replies: many(feedComments, { relationName: 'comment_replies' }),
  likesList: many(feedCommentLikes),
}));

export const feedBookmarksRelations = relations(feedBookmarks, ({ one }) => ({
  post: one(feedPosts, { fields: [feedBookmarks.postId], references: [feedPosts.id] }),
  user: one(users, { fields: [feedBookmarks.userId], references: [users.id] }),
}));

export const feedLikesRelations = relations(feedLikes, ({ one }) => ({
  post: one(feedPosts, { fields: [feedLikes.postId], references: [feedPosts.id] }),
  user: one(users, { fields: [feedLikes.userId], references: [users.id] }),
}));

export const feedCommentLikes = pgTable('feed_comment_likes', {
  id: serial('id').primaryKey(),
  commentId: integer('comment_id').notNull().references(() => feedComments.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reactionType: varchar('reaction_type', { length: 20 }).default('like'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  commentUserIdx: uniqueIndex('feed_comment_likes_comment_user_idx').on(table.commentId, table.userId),
}));

export const feedCommentLikesRelations = relations(feedCommentLikes, ({ one }) => ({
  comment: one(feedComments, { fields: [feedCommentLikes.commentId], references: [feedComments.id] }),
  user: one(users, { fields: [feedCommentLikes.userId], references: [users.id] }),
}));


// ============================================================
// SOCIAL HERO MODULE TABLES
// ============================================================

// --- Social Profiles (mở rộng user info cho social) ---
export const socialProfiles = pgTable('social_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  bio: text('bio'),
  coverUrl: text('cover_url'),
  location: varchar('location', { length: 200 }),
  birthday: varchar('birthday', { length: 10 }), // YYYY-MM-DD string
  website: varchar('website', { length: 500 }),
  relationship: varchar('relationship', { length: 50 }),
  visibility: varchar('visibility', { length: 20 }).notNull().default('public'), // public | friends | private
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// --- Friends / Follow ---
export const socialFriends = pgTable('social_friends', {
  id: serial('id').primaryKey(),
  requesterId: integer('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: integer('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | accepted | blocked
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  requesterIdx: index('social_friends_requester_idx').on(table.requesterId),
  addresseeIdx: index('social_friends_addressee_idx').on(table.addresseeId),
  uniquePair: uniqueIndex('social_friends_pair_idx').on(table.requesterId, table.addresseeId),
}));

// --- Groups ---
export const socialGroups = pgTable('social_groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  coverUrl: text('cover_url'),
  privacy: varchar('privacy', { length: 20 }).notNull().default('public'), // public | private | secret
  createdBy: integer('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  memberCount: integer('member_count').notNull().default(1),
  requireJoinApproval: boolean('require_join_approval').notNull().default(false),
  requirePostApproval: boolean('require_post_approval').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const socialGroupMembers = pgTable('social_group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => socialGroups.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('member'), // admin | moderator | member
  status: varchar('status', { length: 20 }).notNull().default('approved'), // pending | approved | rejected
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  groupUserIdx: uniqueIndex('social_group_members_idx').on(table.groupId, table.userId),
}));

// --- Pages ---
export const socialPages = pgTable('social_pages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  username: varchar('username', { length: 100 }).unique().notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  website: text('website'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followersCount: integer('followers_count').notNull().default(0),
  likesCount: integer('likes_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const socialPageFollowers = pgTable('social_page_followers', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => socialPages.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pageUserIdx: uniqueIndex('social_page_followers_idx').on(table.pageId, table.userId),
}));

// --- Conversations & Messages ---
export const socialConversations = pgTable('social_conversations', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 20 }).notNull().default('direct'), // direct | group
  name: varchar('name', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const socialConversationMembers = pgTable('social_conversation_members', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => socialConversations.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  convUserIdx: uniqueIndex('social_conv_members_idx').on(table.conversationId, table.userId),
}));

export const socialMessages = pgTable('social_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => socialConversations.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: varchar('type', { length: 20 }).notNull().default('text'), // text | image | video | link
  attachmentUrl: text('attachment_url'),
  attachments: text('attachments'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  convIdx: index('social_messages_conv_idx').on(table.conversationId),
  createdAtIdx: index('social_messages_created_idx').on(table.createdAt),
}));

// --- Post Media (multi-image, video) ---
export const postMedia = pgTable('post_media', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(), // image | video_upload | video_external
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  provider: varchar('provider', { length: 30 }).default('upload'), // upload | youtube | tiktok | vimeo | direct
  originalUrl: text('original_url'),
  embedUrl: text('embed_url'),
  title: varchar('title', { length: 500 }),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// --- Moderation Reports ---
export const socialReports = pgTable('social_reports', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: integer('post_id').references(() => feedPosts.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id').references(() => feedComments.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 50 }).notNull(), // spam | harassment | hate_speech | violence | other
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | resolved | dismissed
  resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// --- Content Outbound Hub (Crosspost) ---
export const socialCrossPosts = pgTable('social_cross_posts', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 50 }).notNull(), // facebook, tiktok, zalo, v.v.
  platformPostId: varchar('platform_post_id', { length: 255 }), // ID bài viết trên platform đích
  platformJobId: varchar('platform_job_id', { length: 255 }), // ID job upload của platform (ví dụ tiktok publish_id)
  connectionId: integer('connection_id'), // ID connection trong ConnectHub
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | published | failed
  errorMessage: text('error_message'),
  metrics: jsonb('metrics'), // { likes: 0, comments: 0, shares: 0 }
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// SOCIAL IMPORTED POSTS (Bài viết import từ MXH)
// ==========================================
export const socialImportedPosts = pgTable('social_imported_posts', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectionId: integer('connection_id').notNull(),                  // ConnectHub connection ID
  platform: varchar('platform', { length: 50 }).notNull(),           // facebook, tiktok, v.v.
  externalPostId: varchar('external_post_id', { length: 255 }).notNull(), // ID bài gốc trên MXH
  externalUrl: text('external_url'),
  feedPostId: integer('feed_post_id').references(() => feedPosts.id, { onDelete: 'set null' }), // Bài iSocial tương ứng
  rawData: jsonb('raw_data'),                                        // Data gốc từ API
  syncStatus: varchar('sync_status', { length: 20 }).default('synced'), // synced | skipped | error
  syncedAt: timestamp('synced_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqueExternalPost: uniqueIndex('social_imported_posts_external_idx').on(table.connectionId, table.externalPostId),
}));

// ============================================================
// SOCIAL HERO RELATIONS
// ============================================================

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(feedPosts, { fields: [postMedia.postId], references: [feedPosts.id] }),
}));

export const socialReportsRelations = relations(socialReports, ({ one }) => ({
  team: one(teams, { fields: [socialReports.teamId], references: [teams.id] }),
  reporter: one(users, { fields: [socialReports.reporterId], references: [users.id] }),
  post: one(feedPosts, { fields: [socialReports.postId], references: [feedPosts.id] }),
  comment: one(feedComments, { fields: [socialReports.commentId], references: [feedComments.id] }),
  resolvedByUser: one(users, { fields: [socialReports.resolvedBy], references: [users.id] }),
}));

export const socialCrossPostsRelations = relations(socialCrossPosts, ({ one }) => ({
  post: one(feedPosts, { fields: [socialCrossPosts.postId], references: [feedPosts.id] }),
  user: one(users, { fields: [socialCrossPosts.userId], references: [users.id] }),
}));

export const socialImportedPostsRelations = relations(socialImportedPosts, ({ one }) => ({
  team: one(teams, { fields: [socialImportedPosts.teamId], references: [teams.id] }),
  user: one(users, { fields: [socialImportedPosts.userId], references: [users.id] }),
  feedPost: one(feedPosts, { fields: [socialImportedPosts.feedPostId], references: [feedPosts.id] }),
  // connection is soft-linked to avoid direct cyclical dependencies on bottom of file, but we can do hard link:
  // connection: one(connectHubConnections, { fields: [socialImportedPosts.connectionId], references: [connectHubConnections.id] })
}));

export const socialProfilesRelations = relations(socialProfiles, ({ one }) => ({
  user: one(users, { fields: [socialProfiles.userId], references: [users.id] }),
}));

export const socialFriendsRelations = relations(socialFriends, ({ one }) => ({
  requester: one(users, {
    fields: [socialFriends.requesterId],
    references: [users.id],
    relationName: 'requester'
  }),
  addressee: one(users, {
    fields: [socialFriends.addresseeId],
    references: [users.id],
    relationName: 'addressee'
  }),
}));

export const socialGroupsRelations = relations(socialGroups, ({ one, many }) => ({
  creator: one(users, { fields: [socialGroups.createdBy], references: [users.id] }),
  members: many(socialGroupMembers),
  posts: many(feedPosts),
}));

export const socialGroupMembersRelations = relations(socialGroupMembers, ({ one }) => ({
  group: one(socialGroups, { fields: [socialGroupMembers.groupId], references: [socialGroups.id] }),
  user: one(users, { fields: [socialGroupMembers.userId], references: [users.id] }),
}));

export const socialPagesRelations = relations(socialPages, ({ one, many }) => ({
  owner: one(users, { fields: [socialPages.ownerId], references: [users.id] }),
  followers: many(socialPageFollowers),
  posts: many(feedPosts),
}));

export const socialPageFollowersRelations = relations(socialPageFollowers, ({ one }) => ({
  page: one(socialPages, { fields: [socialPageFollowers.pageId], references: [socialPages.id] }),
  user: one(users, { fields: [socialPageFollowers.userId], references: [users.id] }),
}));

export const socialConversationsRelations = relations(socialConversations, ({ many }) => ({
  members: many(socialConversationMembers),
  messages: many(socialMessages),
}));

export const socialConversationMembersRelations = relations(socialConversationMembers, ({ one }) => ({
  conversation: one(socialConversations, { fields: [socialConversationMembers.conversationId], references: [socialConversations.id] }),
  user: one(users, { fields: [socialConversationMembers.userId], references: [users.id] }),
}));

export const socialMessagesRelations = relations(socialMessages, ({ one }) => ({
  conversation: one(socialConversations, { fields: [socialMessages.conversationId], references: [socialConversations.id] }),
  sender: one(users, { fields: [socialMessages.senderId], references: [users.id] }),
}));

// ============================================================
// SOCIAL HERO TYPES
// ============================================================

export type SocialProfile = typeof socialProfiles.$inferSelect;
export type NewSocialProfile = typeof socialProfiles.$inferInsert;
export type SocialFriend = typeof socialFriends.$inferSelect;
export type NewSocialFriend = typeof socialFriends.$inferInsert;
export type SocialGroup = typeof socialGroups.$inferSelect;
export type NewSocialGroup = typeof socialGroups.$inferInsert;
export type SocialGroupMember = typeof socialGroupMembers.$inferSelect;
export type NewSocialGroupMember = typeof socialGroupMembers.$inferInsert;
export type SocialPage = typeof socialPages.$inferSelect;
export type NewSocialPage = typeof socialPages.$inferInsert;
export type SocialPageFollower = typeof socialPageFollowers.$inferSelect;
export type NewSocialPageFollower = typeof socialPageFollowers.$inferInsert;
export type SocialConversation = typeof socialConversations.$inferSelect;
export type NewSocialConversation = typeof socialConversations.$inferInsert;
export type SocialConversationMember = typeof socialConversationMembers.$inferSelect;
export type NewSocialConversationMember = typeof socialConversationMembers.$inferInsert;
export type SocialMessage = typeof socialMessages.$inferSelect;
export type NewSocialMessage = typeof socialMessages.$inferInsert;
export type PostMedia = typeof postMedia.$inferSelect;
export type NewPostMedia = typeof postMedia.$inferInsert;
export type SocialReport = typeof socialReports.$inferSelect;
export type NewSocialReport = typeof socialReports.$inferInsert;
export type SocialCrossPost = typeof socialCrossPosts.$inferSelect;
export type NewSocialCrossPost = typeof socialCrossPosts.$inferInsert;

export type SocialImportedPost = typeof socialImportedPosts.$inferSelect;
export type NewSocialImportedPost = typeof socialImportedPosts.$inferInsert;

export type FeedPostDB = typeof feedPosts.$inferSelect;
export type NewFeedPostDB = typeof feedPosts.$inferInsert;
export type FeedCommentDB = typeof feedComments.$inferSelect;
export type NewFeedCommentDB = typeof feedComments.$inferInsert;
export type FeedLikeDB = typeof feedLikes.$inferSelect;
export type NewFeedLikeDB = typeof feedLikes.$inferInsert;
export type FeedBookmarkDB = typeof feedBookmarks.$inferSelect;
export type NewFeedBookmarkDB = typeof feedBookmarks.$inferInsert;

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
  healthScore: integer('health_score').notNull().default(100),
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
  tokensUsed: integer('tokens_used').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  modelName: varchar('model_name', { length: 255 }),
  mvpId: varchar('mvp_id', { length: 100 }),
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

// ============================================================
// CONNECT HUB FLOWS MODULE (Phase 7: Webhook Trigger → Actions)
// ============================================================

export const connectHubFlows = pgTable('connect_hub_flows', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  webhookId: uuid('webhook_id')
    .notNull()
    .references(() => connectHubWebhooks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull().default('Flow tự động'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectHubFlowSteps = pgTable('connect_hub_flow_steps', {
  id: serial('id').primaryKey(),
  flowId: integer('flow_id')
    .notNull()
    .references(() => connectHubFlows.id, { onDelete: 'cascade' }),
  step: integer('step').notNull(),        // Thứ tự chạy: 1, 2, 3...
  connectionId: integer('connection_id')
    .notNull()
    .references(() => connectHubConnections.id, { onDelete: 'cascade' }),
  appSlug: varchar('app_slug', { length: 100 }).notNull(),
  actionSlug: varchar('action_slug', { length: 255 }).notNull(),
  inputMapping: jsonb('input_mapping').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectHubFlowRuns = pgTable('connect_hub_flow_runs', {
  id: serial('id').primaryKey(),
  flowId: integer('flow_id')
    .notNull()
    .references(() => connectHubFlows.id, { onDelete: 'cascade' }),
  webhookLogId: integer('webhook_log_id')
    .references(() => connectHubWebhookLogs.id, { onDelete: 'set null' }),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('running'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  stepResults: jsonb('step_results').notNull().default('[]'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const connectHubFlowsRelations = relations(connectHubFlows, ({ one, many }) => ({
  team: one(teams, { fields: [connectHubFlows.teamId], references: [teams.id] }),
  webhook: one(connectHubWebhooks, { fields: [connectHubFlows.webhookId], references: [connectHubWebhooks.id] }),
  steps: many(connectHubFlowSteps),
  runs: many(connectHubFlowRuns),
}));

export const connectHubFlowStepsRelations = relations(connectHubFlowSteps, ({ one }) => ({
  flow: one(connectHubFlows, { fields: [connectHubFlowSteps.flowId], references: [connectHubFlows.id] }),
  connection: one(connectHubConnections, { fields: [connectHubFlowSteps.connectionId], references: [connectHubConnections.id] }),
}));

export const connectHubFlowRunsRelations = relations(connectHubFlowRuns, ({ one }) => ({
  flow: one(connectHubFlows, { fields: [connectHubFlowRuns.flowId], references: [connectHubFlows.id] }),
  team: one(teams, { fields: [connectHubFlowRuns.teamId], references: [teams.id] }),
}));

export type ConnectHubFlow = typeof connectHubFlows.$inferSelect;
export type NewConnectHubFlow = typeof connectHubFlows.$inferInsert;
export type ConnectHubFlowStep = typeof connectHubFlowSteps.$inferSelect;
export type NewConnectHubFlowStep = typeof connectHubFlowSteps.$inferInsert;
export type ConnectHubFlowRun = typeof connectHubFlowRuns.$inferSelect;
export type NewConnectHubFlowRun = typeof connectHubFlowRuns.$inferInsert;


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

// ============================================================================
// HERO SOCIAL — B2B Social Media Manager & Auto-Poster
// ============================================================================

export const heroSocialSchedules = pgTable('hero_social_schedules', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // Link to original iSocial feed post
  sourcePostId: integer('source_post_id').references(() => feedPosts.id, { onDelete: 'set null' }),
  
  // Post content details
  content: text('content').notNull(),
  mediaAttachments: jsonb('media_attachments').default('[]'),
  
  // Video posting format specification (e.g., 'reel' or 'video')
  videoFormat: varchar('video_format', { length: 20 }),
  
  // Batch identifier to group schedules created together
  batchId: varchar('batch_id', { length: 50 }),
  
  // Scheduler parameters
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'publishing' | 'published' | 'failed'
  
  // Cross-posting config
  targetPlatforms: jsonb('target_platforms').notNull().default('["isocial"]'), // ['isocial', 'facebook', 'zalo']
  connectionIds: jsonb('connection_ids').default('[]'), // array of ConnectHubConnection IDs
  
  // Results
  publishedPostIds: jsonb('published_post_ids').default('{}'), // { 'isocial': 123, 'facebook': 'fb_post_id' }
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const heroSocialSchedulesRelations = relations(heroSocialSchedules, ({ one }) => ({
  team: one(teams, { fields: [heroSocialSchedules.teamId], references: [teams.id] }),
  user: one(users, { fields: [heroSocialSchedules.userId], references: [users.id] }),
}));

export type HeroSocialSchedule = typeof heroSocialSchedules.$inferSelect;
export type NewHeroSocialSchedule = typeof heroSocialSchedules.$inferInsert;

// ============================================================================
// HERO CARE — MVP AI CSKH Inbox & Snapshot Cache Module
// ============================================================================

export const heroCareInboxes = pgTable('hero_care_inboxes', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  channel: varchar('channel', { length: 50 }).notNull(), // 'pancake' | 'zalo' | 'telegram' | 'facebook'
  connectionId: integer('connection_id').references(() => connectHubConnections.id, { onDelete: 'set null' }),
  webhookId: uuid('webhook_id').references(() => connectHubWebhooks.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'paused'
  systemPrompt: text('system_prompt'),
  defaultReply: text('default_reply').notNull().default('Hiện tại nhân viên đang bận, chúng tôi sẽ phản hồi sớm.'),
  dailyMessageLimit: integer('daily_message_limit').notNull().default(50),
  dailyAiCallLimit: integer('daily_ai_call_limit').notNull().default(20),
  dailyMessageCount: integer('daily_message_count').notNull().default(0),
  dailyAiCallCount: integer('daily_ai_call_count').notNull().default(0),
  lastResetAt: timestamp('last_reset_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const heroCareSnapshots = pgTable('hero_care_snapshots', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  inboxId: integer('inbox_id').notNull().references(() => heroCareInboxes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  dataType: varchar('data_type', { length: 50 }).notNull(), // 'products' | 'orders' | 'customers' | 'inventory'
  refreshIntervalMinutes: integer('refresh_interval_minutes').notNull().default(15),
  maxStaleMinutes: integer('max_stale_minutes').notNull().default(60),
  allowStaleFallback: integer('allow_stale_fallback').notNull().default(1), // 1 = true, 0 = false
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'paused'
  config: jsonb('config').default('{}'),
  lastRefreshedAt: timestamp('last_refreshed_at'),
  nextRefreshAt: timestamp('next_refresh_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const heroCareCustomers = pgTable('hero_care_customers', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  externalCustomerId: varchar('external_customer_id', { length: 255 }), // ID trên kênh gốc
  channel: varchar('channel', { length: 50 }), // Kênh liên lạc chính
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  avatar: text('avatar'),
  tags: jsonb('tags').default('[]'), // ['vip', 'wholesale', 'complaint']
  notes: text('notes'),
  totalConversations: integer('total_conversations').default(0),
  totalOrders: integer('total_orders').default(0),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('hero_care_cust_team_idx').on(table.teamId),
  externalIdx: index('hero_care_cust_ext_idx').on(table.externalCustomerId),
}));

export const heroCareConversations = pgTable('hero_care_conversations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  inboxId: integer('inbox_id').notNull().references(() => heroCareInboxes.id, { onDelete: 'cascade' }),
  externalConversationId: varchar('external_conversation_id', { length: 255 }).notNull(), // Conversation ID on channel
  customerId: integer('customer_id').references(() => heroCareCustomers.id, { onDelete: 'set null' }),
  chatMode: varchar('chat_mode', { length: 20 }).notNull().default('hybrid'), // 'auto' | 'hybrid' | 'manual'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'pending_agent' | 'resolved'
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const heroCareMessages = pgTable('hero_care_messages', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  inboxId: integer('inbox_id').notNull().references(() => heroCareInboxes.id, { onDelete: 'cascade' }),
  conversationId: integer('conversation_id').notNull().references(() => heroCareConversations.id, { onDelete: 'cascade' }),
  externalMessageId: varchar('external_message_id', { length: 255 }),
  senderId: varchar('sender_id', { length: 255 }), // Sender ID on channel
  senderName: varchar('sender_name', { length: 255 }),
  direction: varchar('direction', { length: 20 }).notNull(), // 'inbound' | 'outbound'
  messageType: varchar('message_type', { length: 20 }).notNull().default('text'), // 'text' | 'image' | 'file'
  content: text('content').notNull(),
  attachments: jsonb('attachments').default('[]'),
  aiStatus: varchar('ai_status', { length: 20 }), // 'success' | 'failed' | 'fallback' | 'handoff' | 'script' | 'blocked'
  aiConfidence: integer('ai_confidence'), // 0-100
  usedSnapshotIds: jsonb('used_snapshot_ids').default('[]'),
  usedScriptIds: jsonb('used_script_ids').default('[]'),
  handoffReason: text('handoff_reason'),
  draftContent: text('draft_content'),
  draftStatus: varchar('draft_status', { length: 20 }), // 'pending' | 'approved' | 'rejected' | 'edited'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const heroCareScripts = pgTable('hero_care_scripts', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  inboxId: integer('inbox_id').references(() => heroCareInboxes.id, { onDelete: 'cascade' }),
  triggerText: text('trigger_text').notNull(),
  keywords: jsonb('keywords').default('[]'), // ["đổi trả", "hoàn tiền"]
  negativeKeywords: jsonb('negative_keywords').default('[]'),
  triggerExamples: jsonb('trigger_examples').default('[]'),
  intent: varchar('intent', { length: 50 }),
  confidenceThreshold: integer('confidence_threshold').default(70),
  replyText: text('reply_text').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'paused'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const heroCareSnapshotItems = pgTable('hero_care_snapshot_items', {
  id: serial('id').primaryKey(),
  snapshotId: integer('snapshot_id').notNull().references(() => heroCareSnapshots.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  dataType: varchar('data_type', { length: 50 }).notNull(), // 'products' | 'orders' | 'customers'
  entityKey: varchar('entity_key', { length: 255 }).notNull(), // SKU / orderCode / phone
  entityName: varchar('entity_name', { length: 255 }), // Display name
  data: jsonb('data').notNull(),
  dataHash: varchar('data_hash', { length: 64 }), // SHA-256 for updates detection
  refreshedAt: timestamp('refreshed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  snapshotIdx: index('hero_care_si_snapshot_idx').on(table.snapshotId),
  entityIdx: index('hero_care_si_entity_idx').on(table.entityKey),
}));

export const heroCareGuardrails = pgTable('hero_care_guardrails', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  inboxId: integer('inbox_id').references(() => heroCareInboxes.id, { onDelete: 'cascade' }),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  condition: jsonb('condition').notNull(),
  action: varchar('action', { length: 20 }).notNull().default('handoff'), // 'handoff' | 'block' | 'warn'
  enabled: integer('enabled').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const heroCareEvents = pgTable('hero_care_events', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  inboxId: integer('inbox_id').references(() => heroCareInboxes.id, { onDelete: 'set null' }),
  conversationId: integer('conversation_id').references(() => heroCareConversations.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  payload: jsonb('payload'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('hero_care_events_team_idx').on(table.teamId),
  processedIdx: index('hero_care_events_processed_idx').on(table.processedAt),
}));

// ============================================================================
// HERO CARE RELATIONS
// ============================================================================

export const heroCareInboxesRelations = relations(heroCareInboxes, ({ one, many }) => ({
  team: one(teams, { fields: [heroCareInboxes.teamId], references: [teams.id] }),
  connection: one(connectHubConnections, { fields: [heroCareInboxes.connectionId], references: [connectHubConnections.id] }),
  webhook: one(connectHubWebhooks, { fields: [heroCareInboxes.webhookId], references: [connectHubWebhooks.id] }),
  snapshots: many(heroCareSnapshots),
  conversations: many(heroCareConversations),
  scripts: many(heroCareScripts),
  guardrails: many(heroCareGuardrails),
  events: many(heroCareEvents),
}));

export const heroCareSnapshotsRelations = relations(heroCareSnapshots, ({ one, many }) => ({
  team: one(teams, { fields: [heroCareSnapshots.teamId], references: [teams.id] }),
  inbox: one(heroCareInboxes, { fields: [heroCareSnapshots.inboxId], references: [heroCareInboxes.id] }),
  items: many(heroCareSnapshotItems),
}));

export const heroCareConversationsRelations = relations(heroCareConversations, ({ one, many }) => ({
  team: one(teams, { fields: [heroCareConversations.teamId], references: [teams.id] }),
  inbox: one(heroCareInboxes, { fields: [heroCareConversations.inboxId], references: [heroCareInboxes.id] }),
  customer: one(heroCareCustomers, { fields: [heroCareConversations.customerId], references: [heroCareCustomers.id] }),
  messages: many(heroCareMessages),
  events: many(heroCareEvents),
}));

export const heroCareCustomersRelations = relations(heroCareCustomers, ({ one, many }) => ({
  team: one(teams, { fields: [heroCareCustomers.teamId], references: [teams.id] }),
  conversations: many(heroCareConversations),
}));

export const heroCareMessagesRelations = relations(heroCareMessages, ({ one }) => ({
  team: one(teams, { fields: [heroCareMessages.teamId], references: [teams.id] }),
  inbox: one(heroCareInboxes, { fields: [heroCareMessages.inboxId], references: [heroCareInboxes.id] }),
  conversation: one(heroCareConversations, { fields: [heroCareMessages.conversationId], references: [heroCareConversations.id] }),
}));

export const heroCareScriptsRelations = relations(heroCareScripts, ({ one }) => ({
  team: one(teams, { fields: [heroCareScripts.teamId], references: [teams.id] }),
  inbox: one(heroCareInboxes, { fields: [heroCareScripts.inboxId], references: [heroCareInboxes.id] }),
}));

export const heroCareSnapshotItemsRelations = relations(heroCareSnapshotItems, ({ one }) => ({
  team: one(teams, { fields: [heroCareSnapshotItems.teamId], references: [teams.id] }),
  snapshot: one(heroCareSnapshots, { fields: [heroCareSnapshotItems.snapshotId], references: [heroCareSnapshots.id] }),
}));

export const heroCareGuardrailsRelations = relations(heroCareGuardrails, ({ one }) => ({
  team: one(teams, { fields: [heroCareGuardrails.teamId], references: [teams.id] }),
  inbox: one(heroCareInboxes, { fields: [heroCareGuardrails.inboxId], references: [heroCareInboxes.id] }),
}));

export const heroCareEventsRelations = relations(heroCareEvents, ({ one }) => ({
  team: one(teams, { fields: [heroCareEvents.teamId], references: [teams.id] }),
  inbox: one(heroCareInboxes, { fields: [heroCareEvents.inboxId], references: [heroCareInboxes.id] }),
  conversation: one(heroCareConversations, { fields: [heroCareEvents.conversationId], references: [heroCareConversations.id] }),
}));

// ============================================================================
// HERO CARE TYPES
// ============================================================================

export type HeroCareInbox = typeof heroCareInboxes.$inferSelect;
export type NewHeroCareInbox = typeof heroCareInboxes.$inferInsert;
export type HeroCareSnapshot = typeof heroCareSnapshots.$inferSelect;
export type NewHeroCareSnapshot = typeof heroCareSnapshots.$inferInsert;
export type HeroCareConversation = typeof heroCareConversations.$inferSelect;
export type NewHeroCareConversation = typeof heroCareConversations.$inferInsert;
export type HeroCareCustomer = typeof heroCareCustomers.$inferSelect;
export type NewHeroCareCustomer = typeof heroCareCustomers.$inferInsert;
export type HeroCareMessage = typeof heroCareMessages.$inferSelect;
export type NewHeroCareMessage = typeof heroCareMessages.$inferInsert;
export type HeroCareScript = typeof heroCareScripts.$inferSelect;
export type NewHeroCareScript = typeof heroCareScripts.$inferInsert;
export type HeroCareSnapshotItem = typeof heroCareSnapshotItems.$inferSelect;
export type NewHeroCareSnapshotItem = typeof heroCareSnapshotItems.$inferInsert;
export type HeroCareGuardrail = typeof heroCareGuardrails.$inferSelect;
export type NewHeroCareGuardrail = typeof heroCareGuardrails.$inferInsert;
export type HeroCareEvent = typeof heroCareEvents.$inferSelect;
export type NewHeroCareEvent = typeof heroCareEvents.$inferInsert;

// ============================================================================
// HERO WEB (Website Builder)
// ============================================================================

export const websites = pgTable('websites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 255 }).unique().notNull(),
  customDomain: varchar('custom_domain', { length: 255 }).unique(),
  templateId: varchar('template_id', { length: 50 }).notNull().default('default'),
  themeConfig: jsonb('theme_config'),
  linkedPageId: integer('linked_page_id'),
  linkedProfileId: integer('linked_profile_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const websitesRelations = relations(websites, ({ one }) => ({
  user: one(users, { fields: [websites.userId], references: [users.id] }),
  linkedPage: one(socialPages, { fields: [websites.linkedPageId], references: [socialPages.id] }),
  linkedProfile: one(socialProfiles, { fields: [websites.linkedProfileId], references: [socialProfiles.userId] }),
}));

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;

// ============================================================================
// MVP2: HERO MARKETPLACE — Thương Mại Điện Tử Đa Kênh
// ============================================================================

export const marketplaceShops = pgTable('marketplace_shops', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  coverUrl: varchar('cover_url', { length: 500 }),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'inactive', 'banned'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const marketplaceCategories = pgTable('marketplace_categories', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  parentId: integer('parent_id'), // self-referencing (can't do it inline cleanly without manual relations sometimes)
  icon: varchar('icon', { length: 255 }),
  sortOrder: integer('sort_order').default(0),
});

export const marketplaceProducts = pgTable('marketplace_products', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  shopId: integer('shop_id').notNull().references(() => marketplaceShops.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => marketplaceCategories.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  price: integer('price').notNull().default(0),
  comparePrice: integer('compare_price'),
  images: jsonb('images').default('[]'), // array of urls
  stock: integer('stock').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'draft', 'out_of_stock'
  
  // New Expanded fields
  sku: varchar('sku', { length: 100 }),
  costPrice: integer('cost_price').default(0),
  minStock: integer('min_stock').default(0),
  reserved: integer('reserved').default(0), // stock reserved for pending orders
  avgDailySales: integer('avg_daily_sales').default(0),
  weight: integer('weight').default(0), // in grams
  aiStatus: varchar('ai_status', { length: 50 }).default('active'), // 'active', 'limited', 'hidden'
  tierPrices: jsonb('tier_prices').default('[]'), // array of { moq, price, label }
  aiConfig: jsonb('ai_config').default('{}'), // aliases, sampleText, dontSay, note, upsellSkus, substituteSkus

  // Sync fields
  sourcePlatform: varchar('source_platform', { length: 50 }).default('manual'), // 'manual', 'kiotviet', 'shopee', 'tiktok'
  sourceId: varchar('source_id', { length: 255 }), // original id on source platform
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const marketplaceOrders = pgTable('marketplace_orders', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  shopId: integer('shop_id').notNull().references(() => marketplaceShops.id, { onDelete: 'cascade' }),
  buyerUserId: integer('buyer_user_id'), // optional if guest, but let's say registered
  items: jsonb('items').notNull().default('[]'), // array of { productId, quantity, price }
  totalAmount: integer('total_amount').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'paid', 'shipping', 'completed', 'cancelled'
  
  // New Expanded fields
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  customerAddress: text('customer_address'),
  source: varchar('source', { length: 50 }).default('manual'), // 'shopee', 'tiktok', 'zalo', 'facebook', 'pos', 'manual'
  carrier: varchar('carrier', { length: 50 }), // 'ghn', 'ghtk', 'vtp', 'spx', 'jt'
  trackingNumber: varchar('tracking_number', { length: 255 }),
  shippingFee: integer('shipping_fee').default(0),
  discount: integer('discount').default(0),
  platformFee: integer('platform_fee').default(0),
  profit: integer('profit').default(0),
  printCount: integer('print_count').notNull().default(0),
  shippingDeadline: timestamp('shipping_deadline'),
  timeline: jsonb('timeline').default('[]'), // [{event, time, by, detail}]
  returnReason: varchar('return_reason', { length: 100 }),
  returnStatus: varchar('return_status', { length: 50 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const marketplaceWallets = pgTable('marketplace_wallets', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }).unique(),
  balance: integer('balance').notNull().default(0),
  currency: varchar('currency', { length: 10 }).notNull().default('VND'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const marketplaceTransactions = pgTable('marketplace_transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').notNull().references(() => marketplaceWallets.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'deposit', 'withdraw', 'payment_received', 'fee'
  referenceId: varchar('reference_id', { length: 255 }), // external tx id or order id
  status: varchar('status', { length: 50 }).notNull().default('completed'), // 'pending', 'completed', 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const marketplaceShippingConfigs = pgTable('marketplace_shipping_configs', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').notNull().references(() => marketplaceShops.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'ghn', 'ghtk', 'viettelpost'
  connectionId: integer('connection_id').notNull().references(() => connectHubConnections.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const marketplaceShopsRelations = relations(marketplaceShops, ({ one, many }) => ({
  team: one(teams, { fields: [marketplaceShops.teamId], references: [teams.id] }),
  user: one(users, { fields: [marketplaceShops.userId], references: [users.id] }),
  products: many(marketplaceProducts),
  orders: many(marketplaceOrders),
  shippingConfigs: many(marketplaceShippingConfigs)
}));

export const marketplaceProductsRelations = relations(marketplaceProducts, ({ one }) => ({
  shop: one(marketplaceShops, { fields: [marketplaceProducts.shopId], references: [marketplaceShops.id] }),
  category: one(marketplaceCategories, { fields: [marketplaceProducts.categoryId], references: [marketplaceCategories.id] }),
  team: one(teams, { fields: [marketplaceProducts.teamId], references: [teams.id] }),
}));

export const marketplaceOrdersRelations = relations(marketplaceOrders, ({ one }) => ({
  shop: one(marketplaceShops, { fields: [marketplaceOrders.shopId], references: [marketplaceShops.id] }),
  team: one(teams, { fields: [marketplaceOrders.teamId], references: [teams.id] }),
}));

export const marketplaceWalletsRelations = relations(marketplaceWallets, ({ one, many }) => ({
  team: one(teams, { fields: [marketplaceWallets.teamId], references: [teams.id] }),
  transactions: many(marketplaceTransactions)
}));

export const marketplaceTransactionsRelations = relations(marketplaceTransactions, ({ one }) => ({
  wallet: one(marketplaceWallets, { fields: [marketplaceTransactions.walletId], references: [marketplaceWallets.id] })
}));

export const marketplaceShippingConfigsRelations = relations(marketplaceShippingConfigs, ({ one }) => ({
  shop: one(marketplaceShops, { fields: [marketplaceShippingConfigs.shopId], references: [marketplaceShops.id] }),
  connection: one(connectHubConnections, { fields: [marketplaceShippingConfigs.connectionId], references: [connectHubConnections.id] })
}));

// Types
export type MarketplaceShop = typeof marketplaceShops.$inferSelect;
export type MarketplaceProduct = typeof marketplaceProducts.$inferSelect;
export type MarketplaceOrder = typeof marketplaceOrders.$inferSelect;
export type MarketplaceWallet = typeof marketplaceWallets.$inferSelect;
export type MarketplaceTransaction = typeof marketplaceTransactions.$inferSelect;

export type MarketplaceOrderItem = { productId: number; name: string; sku: string; quantity: number; price: number; }
export type MarketplaceTimelineEvent = { event: string; time: string; by: string; detail: string; }
export type MarketplaceTierPrice = { moq: number; price: number; label: string; }

// ============================================================================
// HERO AGENT NODE MODULE
// ============================================================================

export const agentNodeTasks = pgTable('agent_node_tasks', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  
  // Task definition
  url: text('url').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('article'),
  // type: 'article' | 'social_post' | 'comments' | 'product' | 'custom'
  priority: integer('priority').notNull().default(3), // 1=low, 5=urgent
  
  // Execution state
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed'
  assignedAt: timestamp('assigned_at'),   // Khi Extension nhận task
  completedAt: timestamp('completed_at'), // Khi hoàn tất
  errorMessage: text('error_message'),    // Nếu failed
  
  // AI Processing
  aiConnectionId: integer('ai_connection_id'), // Connect Hub connection để gọi AI
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const agentNodeResults = pgTable('agent_node_results', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull().references(() => agentNodeTasks.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  // Raw scraped data
  rawTitle: text('raw_title'),
  rawContent: text('raw_content'),        // Markdown text đã clean
  rawMetadata: jsonb('raw_metadata'),     // { platform, author, date, commentCount, ... }
  rawLength: integer('raw_length'),       // Bytes gốc (trước clean)
  cleanLength: integer('clean_length'),   // Bytes sau clean
  sourceUrl: text('source_url'),          // URL gốc (để truy nguồn khi viết bài)
  
  // AI analysis result
  aiSummary: text('ai_summary'),          // Tóm tắt AI
  aiAnalysis: jsonb('ai_analysis'),       // { sentiment, topics, entities, ... }
  aiModel: varchar('ai_model', { length: 50 }), // Model đã dùng
  aiTokensUsed: integer('ai_tokens_used'),
  
  // === CONTENT PIPELINE FIELDS (sẵn sàng cho MVP Content Creator) ===
  tags: jsonb('tags'),                    // ["marketing", "skincare", "trend"] — AI tự gán
  keywords: jsonb('keywords'),            // ["serum", "vitamin C", "da dầu"] — SEO keywords
  contentAngles: jsonb('content_angles'),  // ["So sánh sản phẩm", "Review chi tiết"] — góc viết gợi ý
  tone: varchar('tone', { length: 30 }),  // "professional" | "casual" | "humorous" — tone bài gốc
  language: varchar('language', { length: 10 }).default('vi'), // "vi" | "en" | "zh"
  contentReady: boolean('content_ready').default(false), // true = đã qua AI, sẵn sàng dùng
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const agentNodeTasksRelations = relations(agentNodeTasks, ({ one, many }) => ({
  team: one(teams, { fields: [agentNodeTasks.teamId], references: [teams.id] }),
  user: one(users, { fields: [agentNodeTasks.userId], references: [users.id] }),
  results: many(agentNodeResults),
}));

export const agentNodeResultsRelations = relations(agentNodeResults, ({ one }) => ({
  task: one(agentNodeTasks, { fields: [agentNodeResults.taskId], references: [agentNodeTasks.id] }),
  team: one(teams, { fields: [agentNodeResults.teamId], references: [teams.id] }),
}));

// Types
export type AgentNodeTask = typeof agentNodeTasks.$inferSelect;
export type NewAgentNodeTask = typeof agentNodeTasks.$inferInsert;
export type AgentNodeResult = typeof agentNodeResults.$inferSelect;
export type NewAgentNodeResult = typeof agentNodeResults.$inferInsert;

// ============================================================================
// HERO VIDEO MAKER MODULE
// ============================================================================

export const videoProjects = pgTable('video_projects', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('draft'),
  // 'draft' | 'generating' | 'ready_to_render' | 'rendering' | 'done' | 'error'
  scenes: jsonb('scenes').default([]),
  // [{ order, narration, imageUrl, duration, imagePrompt }]
  outputUrl: text('output_url'),           // URL video sau render
  outputStorage: varchar('output_storage', { length: 20 }),  // 'local' | 'google-drive' | 'r2'
  renderDeviceId: integer('render_device_id'),  // extensionTokens.id
  totalDuration: integer('total_duration'),      // seconds
  
  // Các trường cấu hình bổ sung từ Toonflow
  projectType: varchar('project_type', { length: 50 }),
  imageModel: varchar('image_model', { length: 100 }),
  imageQuality: varchar('image_quality', { length: 50 }),
  videoModel: varchar('video_model', { length: 100 }),
  intro: text('intro'),
  type: varchar('type', { length: 50 }), // 'novel' | 'script'
  artStyle: text('art_style'),
  directorManual: text('director_manual'),
  mode: varchar('mode', { length: 50 }),
  videoRatio: varchar('video_ratio', { length: 20 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bảng Novel (Chương tiểu thuyết)
export const videoNovels = pgTable('video_novels', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  chapterIndex: integer('chapter_index').notNull(),
  reel: text('reel'),
  chapter: text('chapter').notNull(), // Tên chương
  chapterData: text('chapter_data').notNull(), // Nội dung chương
  eventState: integer('event_state').default(0).notNull(), // 0: draft, 1: generating, 2: ready, 3: error
  event: text('event'), // Kết quả trích sự kiện
  errorReason: text('error_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bảng Kịch bản
export const videoScripts = pgTable('video_scripts', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  content: text('content').notNull(),
  extractState: integer('extract_state').default(0).notNull(), // 0: draft, 1: extracting, 2: ready, 3: error
  errorReason: text('error_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bảng Assets của VideoMaker (Tài sản nhân vật, bối cảnh, đạo cụ)
export const videoMakerAssets = pgTable('video_maker_assets', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  scriptId: integer('script_id'), // optional references
  imageId: integer('image_id'), // optional references (sau khi sinh ảnh cho asset)
  assetId: integer('asset_id'), // asset gốc nếu là state biến thể (derive)
  flowId: integer('flow_id'),
  name: varchar('name', { length: 255 }).notNull(),
  prompt: text('prompt'),
  remark: text('remark'),
  type: varchar('type', { length: 50 }).notNull(), // 'role' | 'scene' | 'tool'
  describe: text('describe'),
  startTime: integer('start_time'),
  promptState: varchar('prompt_state', { length: 50 }), // 'generating' | 'done' | 'error'
  audioBindState: integer('audio_bind_state'),
  promptErrorReason: text('prompt_error_reason'),
  derivativeMetadata: jsonb('derivative_metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bảng Ảnh sinh từ AI
export const videoImages = pgTable('video_images', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id'), // optional reference to videoMakerAssets
  filePath: text('file_path').notNull(),
  type: varchar('type', { length: 50 }), // 'assets' | 'storyboard'
  model: varchar('model', { length: 100 }),
  resolution: varchar('resolution', { length: 50 }),
  state: varchar('state', { length: 50 }).default('generating').notNull(), // 'generating' | 'done' | 'error'
  errorReason: text('error_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bảng Phân cảnh (Storyboard)
export const videoStoryboards = pgTable('video_storyboards', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  scriptId: integer('script_id').references(() => videoScripts.id, { onDelete: 'cascade' }),
  prompt: text('prompt'), // Prompt sinh ảnh phân cảnh
  filePath: text('file_path'), // Đường dẫn ảnh phân cảnh
  duration: varchar('duration', { length: 50 }),
  state: varchar('state', { length: 50 }).default('generating').notNull(), // 'generating' | 'done' | 'error'
  trackId: integer('track_id'),
  reason: text('reason'),
  track: varchar('track', { length: 100 }),
  videoDesc: text('video_desc'), // Mô tả phân cảnh (videoDesc)
  shouldGenerateImage: integer('should_generate_image').default(1).notNull(), // 0: no, 1: yes
  flowId: integer('flow_id'),
  index: integer('index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bảng Video Clip ngắn sinh từ AI/render local
export const videoClips = pgTable('video_clips', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  storyboardId: integer('storyboard_id').notNull().references(() => videoStoryboards.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  errorReason: text('error_reason'),
  state: varchar('state', { length: 50 }).default('rendering').notNull(), // 'rendering' | 'done' | 'error'
  model: varchar('model', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bảng Track / Timeline
export const videoTracks = pgTable('video_tracks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  data: jsonb('data').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bảng liên kết Kịch bản <-> Tài sản (n-n)
export const videoScriptAssets = pgTable('video_script_assets', {
  scriptId: integer('script_id').notNull().references(() => videoScripts.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id').notNull().references(() => videoMakerAssets.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.scriptId, table.assetId] }),
}));

// Bảng liên kết Tài sản <-> Phân cảnh (n-n)
export const videoMakerAssets2Storyboards = pgTable('video_maker_assets_2_storyboards', {
  assetId: integer('asset_id').notNull().references(() => videoMakerAssets.id, { onDelete: 'cascade' }),
  storyboardId: integer('storyboard_id').notNull().references(() => videoStoryboards.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.assetId, table.storyboardId] }),
}));

// Bảng Phong cách nghệ thuật
export const videoArtStyles = pgTable('video_art_styles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  fileUrl: text('file_url'),
  label: varchar('label', { length: 100 }),
  prompt: text('prompt').notNull(),
});

// Bảng Prompts mẫu (eventExtraction, scriptAssetExtraction, v.v.)
export const videoPrompts = pgTable('video_prompts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  data: text('data').notNull(),
  useData: text('use_data'),
});

// Bảng Dữ liệu làm việc của Agent
export const videoAgentWorkData = pgTable('video_agent_work_data', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  episodesId: integer('episodes_id'),
  key: varchar('key', { length: 100 }), // ví dụ: 'skeleton', 'adaptation', 'flow'
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Bảng Tasks AI (Quản lý các task đang chạy bất đồng bộ)
export const videoTasks = pgTable('video_tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => videoProjects.id, { onDelete: 'cascade' }),
  taskClass: varchar('task_class', { length: 100 }), // ví dụ: 'event_extraction', 'asset_image_generation'
  relatedObjects: text('related_objects'), // danh sách IDs liên quan
  model: varchar('model', { length: 100 }),
  describe: text('describe'),
  state: varchar('state', { length: 50 }).default('pending').notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  startTime: integer('start_time'), // Unix timestamp
  reason: text('reason'), // lỗi nếu failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Relations ---

export const videoProjectsRelations = relations(videoProjects, ({ one, many }) => ({
  team: one(teams, { fields: [videoProjects.teamId], references: [teams.id] }),
  user: one(users, { fields: [videoProjects.userId], references: [users.id] }),
  novels: many(videoNovels),
  scripts: many(videoScripts),
  assets: many(videoMakerAssets),
  images: many(videoImages),
  storyboards: many(videoStoryboards),
  clips: many(videoClips),
  agentWorkDatas: many(videoAgentWorkData),
  tasks: many(videoTasks),
  tracks: many(videoTracks),
}));

export const videoNovelsRelations = relations(videoNovels, ({ one }) => ({
  project: one(videoProjects, { fields: [videoNovels.projectId], references: [videoProjects.id] }),
}));

export const videoScriptsRelations = relations(videoScripts, ({ one, many }) => ({
  project: one(videoProjects, { fields: [videoScripts.projectId], references: [videoProjects.id] }),
  scriptAssets: many(videoScriptAssets),
  storyboards: many(videoStoryboards),
}));

export const videoMakerAssetsRelations = relations(videoMakerAssets, ({ one, many }) => ({
  project: one(videoProjects, { fields: [videoMakerAssets.projectId], references: [videoProjects.id] }),
  script: one(videoScripts, { fields: [videoMakerAssets.scriptId], references: [videoScripts.id] }),
  image: one(videoImages, { fields: [videoMakerAssets.imageId], references: [videoImages.id] }),
  parentAsset: one(videoMakerAssets, { fields: [videoMakerAssets.assetId], references: [videoMakerAssets.id], relationName: 'deriveAssets' }),
  deriveAssets: many(videoMakerAssets, { relationName: 'deriveAssets' }),
  scriptAssets: many(videoScriptAssets),
  assets2storyboards: many(videoMakerAssets2Storyboards),
}));

export const videoImagesRelations = relations(videoImages, ({ one }) => ({
  project: one(videoProjects, { fields: [videoImages.projectId], references: [videoProjects.id] }),
  asset: one(videoMakerAssets, { fields: [videoImages.assetId], references: [videoMakerAssets.id] }),
}));

export const videoStoryboardsRelations = relations(videoStoryboards, ({ one, many }) => ({
  project: one(videoProjects, { fields: [videoStoryboards.projectId], references: [videoProjects.id] }),
  script: one(videoScripts, { fields: [videoStoryboards.scriptId], references: [videoScripts.id] }),
  clips: many(videoClips),
  assets2storyboards: many(videoMakerAssets2Storyboards),
}));

export const videoClipsRelations = relations(videoClips, ({ one }) => ({
  project: one(videoProjects, { fields: [videoClips.projectId], references: [videoProjects.id] }),
  storyboard: one(videoStoryboards, { fields: [videoClips.storyboardId], references: [videoStoryboards.id] }),
}));

export const videoScriptAssetsRelations = relations(videoScriptAssets, ({ one }) => ({
  script: one(videoScripts, { fields: [videoScriptAssets.scriptId], references: [videoScripts.id] }),
  asset: one(videoMakerAssets, { fields: [videoScriptAssets.assetId], references: [videoMakerAssets.id] }),
}));

export const videoMakerAssets2StoryboardsRelations = relations(videoMakerAssets2Storyboards, ({ one }) => ({
  asset: one(videoMakerAssets, { fields: [videoMakerAssets2Storyboards.assetId], references: [videoMakerAssets.id] }),
  storyboard: one(videoStoryboards, { fields: [videoMakerAssets2Storyboards.storyboardId], references: [videoStoryboards.id] }),
}));

export const videoAgentWorkDataRelations = relations(videoAgentWorkData, ({ one }) => ({
  project: one(videoProjects, { fields: [videoAgentWorkData.projectId], references: [videoProjects.id] }),
}));

export const videoTasksRelations = relations(videoTasks, ({ one }) => ({
  project: one(videoProjects, { fields: [videoTasks.projectId], references: [videoProjects.id] }),
}));

export const videoTracksRelations = relations(videoTracks, ({ one }) => ({
  project: one(videoProjects, { fields: [videoTracks.projectId], references: [videoProjects.id] }),
}));

// --- Export Types ---

export type VideoProject = typeof videoProjects.$inferSelect;
export type NewVideoProject = typeof videoProjects.$inferInsert;

export type VideoNovel = typeof videoNovels.$inferSelect;
export type NewVideoNovel = typeof videoNovels.$inferInsert;

export type VideoScript = typeof videoScripts.$inferSelect;
export type NewVideoScript = typeof videoScripts.$inferInsert;

export type VideoMakerAsset = typeof videoMakerAssets.$inferSelect;
export type NewVideoMakerAsset = typeof videoMakerAssets.$inferInsert;

export type VideoImage = typeof videoImages.$inferSelect;
export type NewVideoImage = typeof videoImages.$inferInsert;

export type VideoStoryboard = typeof videoStoryboards.$inferSelect;
export type NewVideoStoryboard = typeof videoStoryboards.$inferInsert;

export type VideoClip = typeof videoClips.$inferSelect;
export type NewVideoClip = typeof videoClips.$inferInsert;

export type VideoTrack = typeof videoTracks.$inferSelect;
export type NewVideoTrack = typeof videoTracks.$inferInsert;

export type VideoScriptAsset = typeof videoScriptAssets.$inferSelect;
export type NewVideoScriptAsset = typeof videoScriptAssets.$inferInsert;

export type VideoMakerAssets2Storyboard = typeof videoMakerAssets2Storyboards.$inferSelect;
export type NewVideoMakerAssets2Storyboard = typeof videoMakerAssets2Storyboards.$inferInsert;

export type VideoArtStyle = typeof videoArtStyles.$inferSelect;
export type NewVideoArtStyle = typeof videoArtStyles.$inferInsert;

export type VideoPrompt = typeof videoPrompts.$inferSelect;
export type NewVideoPrompt = typeof videoPrompts.$inferInsert;

export type VideoAgentWorkData = typeof videoAgentWorkData.$inferSelect;
export type NewVideoAgentWorkData = typeof videoAgentWorkData.$inferInsert;

export type VideoTask = typeof videoTasks.$inferSelect;
export type NewVideoTask = typeof videoTasks.$inferInsert;

// ═══════════════════════════════════════════════════════
// HERO FILM — Nền tảng phim ngắn dọc (ReelShort/DramaBox style)
// ═══════════════════════════════════════════════════════

export const filmSeries = pgTable('film_series', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  creatorId: integer('creator_id').references(() => users.id, { onDelete: 'set null' }), // Người tải phim lên (user)
  
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }), // Cho URL thân thiện SEO
  description: text('description'),
  coverUrl: text('cover_url'),           // Ảnh bìa dọc 9:16
  bannerUrl: text('banner_url'),         // Ảnh banner ngang (cho trang khám phá)
  trailerUrl: text('trailer_url'),       // URL video trailer (nếu có)
  
  genre: varchar('genre', { length: 100 }),  // 'romance' | 'drama' | 'action' | 'comedy' | 'thriller'
  tags: jsonb('tags'),                       // ["tình cảm", "ngôn tình", "tổng tài"]
  totalEpisodes: integer('total_episodes').notNull().default(0),
  totalFreeEpisodes: integer('total_free_episodes').notNull().default(0), // Số tập miễn phí từ đầu
  
  // Mở rộng thông tin
  director: varchar('director', { length: 255 }), // Đạo diễn (ghi "AI" nếu là AI generate)
  cast: text('cast'),                             // Diễn viên
  releaseYear: integer('release_year'),           // Năm phát hành
  
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // status: 'draft' | 'publishing' | 'completed' | 'archived'
  
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  
  // Sorting & Discovery
  // Sorting & Discovery
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  
  feedPostId: integer('feed_post_id').references(() => feedPosts.id, { onDelete: 'set null' }), // Bài đăng feed liên kết khi publishing
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const filmEpisodes = pgTable('film_episodes', {
  id: serial('id').primaryKey(),
  seriesId: integer('series_id').notNull().references(() => filmSeries.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  episodeNumber: integer('episode_number').notNull(),
  title: varchar('title', { length: 255 }),
  videoUrl: text('video_url').notNull(),     // URL video hoặc YouTube/Facebook URL gốc
  videoSource: varchar('video_source', { length: 20 }).notNull().default('direct'),
  // videoSource: 'direct' (mp4/CDN) | 'youtube' (nhúng iframe) | 'facebook' (nhúng iframe)
  thumbnailUrl: text('thumbnail_url'),       // Ảnh thu nhỏ tập
  duration: integer('duration'),             // Thời lượng (giây)
  
  summary: text('summary'),                  // Tóm tắt nội dung do AI tạo
  timeline: jsonb('timeline'),               // Mốc thời gian do AI tạo [{time: '01:20', label: '...'}]
  
  isFree: boolean('is_free').notNull().default(true),
  tokenPrice: integer('token_price').notNull().default(0), // Giá xem tập phim (bằng token)
  
  viewCount: integer('view_count').notNull().default(0),
  reportCount: integer('report_count').notNull().default(0), // Số lần báo lỗi tập phim
  
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  // status: 'draft' | 'published' | 'hidden'
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const filmWatchHistory = pgTable('film_watch_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => filmSeries.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').notNull().references(() => filmEpisodes.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  watchedSeconds: integer('watched_seconds').notNull().default(0),
  isCompleted: boolean('is_completed').notNull().default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Bảng lưu phim đã đánh dấu (Bookmarks)
export const filmBookmarks = pgTable('film_bookmarks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => filmSeries.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Bảng đánh giá của người dùng (Ratings)
export const filmRatings = pgTable('film_ratings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => filmSeries.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 sao
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Bảng báo lỗi phim (Reports)
export const filmReports = pgTable('film_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => filmSeries.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => filmEpisodes.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 50 }).notNull(), // 'broken_video' | 'wrong_content' | 'copyright' | 'other'
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'resolved' | 'dismissed'
  adminNote: text('admin_note'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Bảng nhật ký giao dịch mua phim (Transactions)
export const filmTransactions = pgTable('film_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => filmSeries.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').notNull().references(() => filmEpisodes.id, { onDelete: 'cascade' }),
  creatorTeamId: integer('creator_team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  
  tokenAmount: integer('token_amount').notNull(),
  creatorAmount: integer('creator_amount').notNull(),  // 70%
  platformAmount: integer('platform_amount').notNull(), // 30%
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Infer types
export type FilmSeries = typeof filmSeries.$inferSelect;
export type NewFilmSeries = typeof filmSeries.$inferInsert;

export type FilmEpisode = typeof filmEpisodes.$inferSelect;
export type NewFilmEpisode = typeof filmEpisodes.$inferInsert;

export type FilmWatchHistory = typeof filmWatchHistory.$inferSelect;
export type NewFilmWatchHistory = typeof filmWatchHistory.$inferInsert;

export type FilmBookmark = typeof filmBookmarks.$inferSelect;
export type NewFilmBookmark = typeof filmBookmarks.$inferInsert;

export type FilmRating = typeof filmRatings.$inferSelect;
export type NewFilmRating = typeof filmRatings.$inferInsert;

export type FilmReport = typeof filmReports.$inferSelect;
export type NewFilmReport = typeof filmReports.$inferInsert;

export type FilmTransaction = typeof filmTransactions.$inferSelect;
export type NewFilmTransaction = typeof filmTransactions.$inferInsert;


export const youtubeSyncChannels = pgTable('youtube_sync_channels', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  creatorId: integer('creator_id')
    .references(() => users.id, { onDelete: 'set null' }),
  channelUrl: text('channel_url').notNull(),
  channelName: varchar('channel_name', { length: 255 }),
  thumbnailUrl: text('thumbnail_url'),
  filters: jsonb('filters').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  totalSynced: integer('total_synced').notNull().default(0),
  totalAiProcessed: integer('total_ai_processed').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════
// HERO DUB — Dịch phụ đề phim Trung Quốc (MVP Phase 1)
// ═══════════════════════════════════════════════════════

export const dubWorkers = pgTable('dub_workers', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deviceName: varchar('device_name', { length: 100 }),
  platform: varchar('platform', { length: 20 }), // 'windows' | 'macos' | 'linux'
  version: varchar('version', { length: 20 }),
  status: varchar('status', { length: 20 }).notNull().default('offline'), // 'online' | 'busy' | 'offline'
  lastSeenAt: timestamp('last_seen_at'),
  accessTokenHash: varchar('access_token_hash', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dubProjects = pgTable('dub_projects', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  logoUrl: text('logo_url'),
  logoPosition: varchar('logo_position', { length: 50 }).notNull().default('top-left'),
  introVideoUrl: text('intro_video_url'),
  outroVideoUrl: text('outro_video_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dubScanConfigs = pgTable('dub_scan_configs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  folderPath: text('folder_path').notNull(),
  intervalMinutes: integer('interval_minutes').notNull().default(60),
  sourceLang: varchar('source_lang', { length: 20 }).notNull().default('zh'),
  targetLang: varchar('target_lang', { length: 20 }).notNull().default('vi'),
  asrEngine: varchar('asr_engine', { length: 50 }).notNull().default('faster-whisper'),
  subtitleMode: varchar('subtitle_mode', { length: 50 }).notNull().default('burn_subtitle'),
  ttsEnabled: boolean('tts_enabled').notNull().default(false),
  ttsEngine: varchar('tts_engine', { length: 50 }).notNull().default('edge-tts'),
  ttsVoice: varchar('tts_voice', { length: 100 }),
  ttsSpeed: varchar('tts_speed', { length: 20 }),
  bgVolume: varchar('bg_volume', { length: 20 }),
  ttsVolume: varchar('tts_volume', { length: 20 }),
  videoSlowdown: varchar('video_slowdown', { length: 10 }).notNull().default('1.0'),
  outputFolder: text('output_folder'),
  translateContext: text('translate_context'),
  redesignThumbnailEnabled: boolean('redesign_thumbnail_enabled').notNull().default(false),
  thumbnailLogoSource: varchar('thumbnail_logo_source', { length: 20 }).notNull().default('project'),
  customThumbnailLogoUrl: text('custom_thumbnail_logo_url'),
  aiAppSlug: varchar('ai_app_slug', { length: 100 }),
  aiModel: varchar('ai_model', { length: 100 }),
  thumbnailAiAppSlug: varchar('thumbnail_ai_app_slug', { length: 100 }),
  thumbnailAiModel: varchar('thumbnail_ai_model', { length: 100 }),
  thumbnailFontStyle: varchar('thumbnail_font_style', { length: 50 }).default('auto'),
  publishingPackEnabled: boolean('publishing_pack_enabled').notNull().default(true),
  lastScanAt: timestamp('last_scan_at'),
  scannedCount: integer('scanned_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dubTasks = pgTable('dub_tasks', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // === Input ===
  inputType: varchar('input_type', { length: 10 }).notNull().default('url'), // 'url' | 'file'
  sourceUrl: text('source_url').notNull(),
  sourceTitle: varchar('source_title', { length: 500 }),
  sourcePlatform: varchar('source_platform', { length: 20 }), // 'douyin' | 'bilibili' | 'youtube' | 'local'
  sourceVideoId: varchar('source_video_id', { length: 100 }),
  sourceLang: varchar('source_lang', { length: 10 }).notNull().default('zh'),
  targetLang: varchar('target_lang', { length: 10 }).notNull().default('vi'),
  durationSec: integer('duration_sec'),
  fileSizeMb: integer('file_size_mb'),
  sourceThumbnailUrl: text('source_thumbnail_url'),
  outputFolder: text('output_folder'),

  // === Config ===
  asrEngine: varchar('asr_engine', { length: 30 }).notNull().default('faster-whisper'), // 'faster-whisper' | 'bcut' | 'openai-whisper'
  translateEngine: varchar('translate_engine', { length: 30 }).notNull().default('connect-hub'), // 'connect-hub' | 'google-free' | 'direct-llm'
  llmModel: varchar('llm_model', { length: 50 }),
  subtitleMode: varchar('subtitle_mode', { length: 20 }).notNull().default('burn_subtitle'), // 'srt_only' | 'burn_subtitle' | 'soft_subtitle'
  qualityPreset: varchar('quality_preset', { length: 10 }).notNull().default('balanced'), // 'fast' | 'balanced' | 'best'
  ttsEngine: varchar('tts_engine', { length: 30 }).notNull().default('edge-tts'), // 'edge-tts' | 'connect-hub'
  ttsVoice: varchar('tts_voice', { length: 100 }), // voice model name
  ttsEnabled: boolean('tts_enabled').notNull().default(false),
  ttsSpeed: varchar('tts_speed', { length: 10 }).notNull().default('1.2'),
  bgVolume: varchar('bg_volume', { length: 20 }),
  ttsVolume: varchar('tts_volume', { length: 20 }),
  videoSlowdown: varchar('video_slowdown', { length: 10 }).notNull().default('1.0'),
  translateContext: text('translate_context'),
  
  // === Thumbnail & Publishing Suite ===
  redesignThumbnailEnabled: boolean('redesign_thumbnail_enabled').notNull().default(false),
  thumbnailLogoSource: varchar('thumbnail_logo_source', { length: 20 }).notNull().default('project'),
  customThumbnailLogoUrl: text('custom_thumbnail_logo_url'),
  thumbnailAiAppSlug: varchar('thumbnail_ai_app_slug', { length: 100 }),
  thumbnailAiModel: varchar('thumbnail_ai_model', { length: 100 }),
  thumbnailFontStyle: varchar('thumbnail_font_style', { length: 50 }).default('auto'),
  publishingPackEnabled: boolean('publishing_pack_enabled').notNull().default(true),
  
  // === Branding ===
  projectId: integer('project_id').references(() => dubProjects.id, { onDelete: 'set null' }),
  scanConfigId: integer('scan_config_id').references(() => dubScanConfigs.id, { onDelete: 'set null' }),
  brandingEnabled: boolean('branding_enabled').notNull().default(false),
  logoUrl: text('logo_url'),
  logoPosition: varchar('logo_position', { length: 50 }).notNull().default('top-left'),
  introVideoUrl: text('intro_video_url'),
  outroVideoUrl: text('outro_video_url'),

  // === Status ===
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'assigned' | 'downloading' | 'transcribing' | 'translating' | 'tts' | 'burning' | 'uploading' | 'completed' | 'failed'
  progress: varchar('progress', { length: 50 }),
  speed: varchar('speed', { length: 50 }),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  workerId: integer('worker_id').references(() => dubWorkers.id, { onDelete: 'set null' }),

  // === Output ===
  translatedTitle: varchar('translated_title', { length: 500 }),
  videoDescription: text('video_description'),
  videoHashtags: text('video_hashtags'),
  resultVideoUrl: text('result_video_url'),
  resultSrtUrl: text('result_srt_url'),
  resultThumbnailUrl: text('result_thumbnail_url'),
  resultPreview: jsonb('result_preview'), // { duration, thumbnail, subtitleCount }
  estimatedCost: integer('estimated_cost'), // cents
  actualCost: integer('actual_cost'), // cents

  // === Dedupe ===
  dedupeKey: varchar('dedupe_key', { length: 255 }), // teamId + sourceUrl + targetLang

  // === Logs ===
  logs: jsonb('logs').default([]),

  // === Timestamps ===
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    dedupeKeyIdx: uniqueIndex('dub_tasks_dedupe_key_idx').on(table.dedupeKey),
  };
});

export const dubResourceLocks = pgTable('dub_resource_locks', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  resourceKey: varchar('resource_key', { length: 50 }).notNull(), // 'whisper_cpu' | 'gpu_render'
  lockedByTask: integer('locked_by_task'),
  workerId: integer('worker_id'),
  lockedAt: timestamp('locked_at').notNull().defaultNow(),
});

// Relations
export const dubWorkersRelations = relations(dubWorkers, ({ one, many }) => ({
  team: one(teams, {
    fields: [dubWorkers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [dubWorkers.userId],
    references: [users.id],
  }),
  tasks: many(dubTasks),
}));

export const dubTasksRelations = relations(dubTasks, ({ one }) => ({
  team: one(teams, {
    fields: [dubTasks.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [dubTasks.userId],
    references: [users.id],
  }),
  worker: one(dubWorkers, {
    fields: [dubTasks.workerId],
    references: [dubWorkers.id],
  }),
}));

// Types
export type DubWorker = typeof dubWorkers.$inferSelect;
export type NewDubWorker = typeof dubWorkers.$inferInsert;
export type DubTask = typeof dubTasks.$inferSelect;
export type NewDubTask = typeof dubTasks.$inferInsert;


// ============================================================
// DOWNLOADER HERO MODULE TABLES
// ============================================================

export const downloaderProjects = pgTable('downloader_projects', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(), // tiktok, douyin, custom
  sourceUrl: text('source_url').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, paused, completed
  totalVideos: integer('total_videos').notNull().default(0),
  downloadedVideos: integer('downloaded_videos').notNull().default(0),
  lastScanAt: timestamp('last_scan_at'),
  settings: jsonb('settings'), // Lưu cookieIds, localFolder, maxScanVideos, ...
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const downloaderVideos = pgTable('downloader_videos', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => downloaderProjects.id, { onDelete: 'cascade' }),
  videoUrl: text('video_url').notNull(),
  title: varchar('title', { length: 500 }),
  author: varchar('author', { length: 255 }),
  thumbnailUrl: text('thumbnail_url'),
  translatedThumbnailUrl: text('translated_thumbnail_url'),
  duration: integer('duration'), // seconds
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, downloading, downloaded, failed
  progress: integer('progress').notNull().default(0), // percentage
  sizeBytes: bigint('size_bytes', { mode: "number" }),
  actualSizeBytes: bigint('actual_size_bytes', { mode: "number" }),
  downloadSpeed: varchar('download_speed', { length: 50 }),
  localPath: text('local_path'),
  error: text('error'),
  directMp4Url: text('direct_mp4_url'),
  extractStatus: varchar('extract_status', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const downloaderCookies = pgTable('downloader_cookies', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  cookieData: text('cookie_data').notNull(), // Netscape format or JSON
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, expired, invalid
  lastCheckedAt: timestamp('last_checked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const downloaderSettings = pgTable('downloader_settings', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  maxConcurrentDownloads: integer('max_concurrent_downloads').notNull().default(3),
  maxConcurrentScans: integer('max_concurrent_scans').notNull().default(2),
  defaultDownloadPath: text('default_download_path'),
  autoStartWorker: integer('auto_start_worker').notNull().default(1), // 0: false, 1: true
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const downloaderProjectsRelations = relations(downloaderProjects, ({ one, many }) => ({
  team: one(teams, { fields: [downloaderProjects.teamId], references: [teams.id] }),
  user: one(users, { fields: [downloaderProjects.userId], references: [users.id] }),
  videos: many(downloaderVideos),
}));

export const downloaderVideosRelations = relations(downloaderVideos, ({ one }) => ({
  project: one(downloaderProjects, { fields: [downloaderVideos.projectId], references: [downloaderProjects.id] }),
}));

export const downloaderCookiesRelations = relations(downloaderCookies, ({ one }) => ({
  team: one(teams, { fields: [downloaderCookies.teamId], references: [teams.id] }),
}));


// ============================================================
// DUB DICTIONARIES TABLE
// ============================================================

export const dubDictionaries = pgTable('dub_dictionaries', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }), // null = Global / System template
  name: varchar('name', { length: 100 }).notNull(),
  genreKey: varchar('genre_key', { length: 50 }).notNull().default('custom'), // xianxia, tayDuKy, coTrang, xuyenKhong, doThi, custom
  keywords: text('keywords').notNull(), // Các từ khóa để auto-detect (cách nhau bởi phẩy)
  promptContent: text('prompt_content').notNull(), // Nội dung xưng hô + thuật ngữ + ASR correction
  evaluationScore: integer('evaluation_score').notNull().default(100), // Thang điểm 0 - 100
  usageCount: integer('usage_count').notNull().default(0), // Số lần được áp dụng
  isAutoUpdate: boolean('is_auto_update').notNull().default(true),
  isGlobal: boolean('is_global').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dubDictionariesRelations = relations(dubDictionaries, ({ one }) => ({
  team: one(teams, { fields: [dubDictionaries.teamId], references: [teams.id] }),
}));

export type DubDictionary = typeof dubDictionaries.$inferSelect;
export type NewDubDictionary = typeof dubDictionaries.$inferInsert;


// ============================================================
// HERO DRIVE MODULE TABLES
// ============================================================

export const driveProjects = pgTable('drive_projects', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'paused' | 'completed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const driveFolderMappings = pgTable('drive_folder_mappings', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => driveProjects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  localFolderPath: text('local_folder_path').notNull(),
  connectionId: integer('connection_id'),
  targetFolderId: varchar('target_folder_id', { length: 255 }),
  targetFolderName: varchar('target_folder_name', { length: 255 }),
  deleteAfterUpload: boolean('delete_after_upload').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  scanInterval: integer('scan_interval').notNull().default(10),
  status: varchar('status', { length: 20 }).notNull().default('idle'),
  lastScanAt: timestamp('last_scan_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const driveScanConfigs = pgTable('drive_scan_configs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  localFolderPath: text('local_folder_path').notNull(),
  connectionId: integer('connection_id'),
  targetFolderId: varchar('target_folder_id', { length: 255 }),
  deleteAfterUpload: boolean('delete_after_upload').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  lastScanAt: timestamp('last_scan_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const driveContents = pgTable('drive_contents', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  configId: integer('config_id').references(() => driveScanConfigs.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => driveProjects.id, { onDelete: 'cascade' }),
  mappingId: integer('mapping_id').references(() => driveFolderMappings.id, { onDelete: 'cascade' }),
  baseName: varchar('base_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'uploading' | 'completed' | 'failed'
  totalFiles: integer('total_files').notNull().default(0),
  uploadedFiles: integer('uploaded_files').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const driveFiles = pgTable('drive_files', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').notNull().references(() => driveContents.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileExtension: varchar('file_extension', { length: 20 }),
  fileType: varchar('file_type', { length: 50 }), // 'video' | 'image' | 'text' | 'other'
  fileSize: bigint('file_size', { mode: 'number' }),
  localPath: text('local_path').notNull(),
  driveFileId: varchar('drive_file_id', { length: 255 }),
  streamLink: text('stream_link'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'uploading' | 'completed' | 'failed' | 'deleted_local'
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const driveProjectsRelations = relations(driveProjects, ({ one, many }) => ({
  team: one(teams, { fields: [driveProjects.teamId], references: [teams.id] }),
  user: one(users, { fields: [driveProjects.userId], references: [users.id] }),
  mappings: many(driveFolderMappings),
  contents: many(driveContents),
}));

export const driveFolderMappingsRelations = relations(driveFolderMappings, ({ one, many }) => ({
  project: one(driveProjects, { fields: [driveFolderMappings.projectId], references: [driveProjects.id] }),
  contents: many(driveContents),
}));

export const driveScanConfigsRelations = relations(driveScanConfigs, ({ one, many }) => ({
  team: one(teams, { fields: [driveScanConfigs.teamId], references: [teams.id] }),
  user: one(users, { fields: [driveScanConfigs.userId], references: [users.id] }),
  contents: many(driveContents),
}));

export const driveContentsRelations = relations(driveContents, ({ one, many }) => ({
  config: one(driveScanConfigs, { fields: [driveContents.configId], references: [driveScanConfigs.id] }),
  project: one(driveProjects, { fields: [driveContents.projectId], references: [driveProjects.id] }),
  mapping: one(driveFolderMappings, { fields: [driveContents.mappingId], references: [driveFolderMappings.id] }),
  files: many(driveFiles),
}));

export const driveFilesRelations = relations(driveFiles, ({ one }) => ({
  content: one(driveContents, { fields: [driveFiles.contentId], references: [driveContents.id] }),
}));

export type DriveProject = typeof driveProjects.$inferSelect;
export type NewDriveProject = typeof driveProjects.$inferInsert;
export type DriveFolderMapping = typeof driveFolderMappings.$inferSelect;
export type NewDriveFolderMapping = typeof driveFolderMappings.$inferInsert;
export type DriveScanConfig = typeof driveScanConfigs.$inferSelect;
export type NewDriveScanConfig = typeof driveScanConfigs.$inferInsert;
export type DriveContent = typeof driveContents.$inferSelect;
export type NewDriveContent = typeof driveContents.$inferInsert;
export type DriveFile = typeof driveFiles.$inferSelect;
export type NewDriveFile = typeof driveFiles.$inferInsert;

// ==========================================
// CONNECT HUB BROWSER BRIDGE JOBS
// ==========================================
export const connectHubBridgeJobs = pgTable('connect_hub_bridge_jobs', {
  id: text('id').primaryKey(), // UUID
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  connectionId: integer('connection_id').notNull().references(() => connectHubConnections.id, { onDelete: 'cascade' }),
  callerModule: varchar('caller_module', { length: 50 }).notNull(),

  // Input
  targetAi: varchar('target_ai', { length: 20 }).notNull().default('gemini'), // 'gemini' | 'chatgpt' | 'claude'
  prompt: text('prompt').notNull(),
  attachments: jsonb('attachments'), // [{ type: 'image' | 'video' | 'file', base64?: string, url?: string }]

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'processing' | 'done' | 'failed'
  result: text('result'), // Kết quả text trả về từ AI
  error: text('error'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const connectHubBridgeJobsRelations = relations(connectHubBridgeJobs, ({ one }) => ({
  team: one(teams, { fields: [connectHubBridgeJobs.teamId], references: [teams.id] }),
  connection: one(connectHubConnections, { fields: [connectHubBridgeJobs.connectionId], references: [connectHubConnections.id] }),
}));

export type ConnectHubBridgeJob = typeof connectHubBridgeJobs.$inferSelect;
export type NewConnectHubBridgeJob = typeof connectHubBridgeJobs.$inferInsert;





