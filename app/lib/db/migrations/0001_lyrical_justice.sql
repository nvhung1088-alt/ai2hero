CREATE TABLE "connect_hub_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"app_slug" varchar(100) NOT NULL,
	"app_name" varchar(255) NOT NULL,
	"connection_name" varchar(255) NOT NULL,
	"auth_type" varchar(50) NOT NULL,
	"encrypted_credentials" text NOT NULL,
	"status" varchar(50) DEFAULT 'connected' NOT NULL,
	"used_by_modules" jsonb DEFAULT '[]',
	"last_tested_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_mapping_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_slug" varchar(100) NOT NULL,
	"team_id" integer,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"caller_module" varchar(100),
	"app_slug" varchar(100),
	"action_name" varchar(255),
	"status" varchar(50) NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"is_test" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_link_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"code" varchar(8) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"device_name" varchar(100) DEFAULT 'Chrome Extension',
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" varchar(100) NOT NULL,
	"user_avatar" varchar(50) DEFAULT '👤' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"user_id" integer NOT NULL,
	"type" varchar(30) DEFAULT 'system_activity' NOT NULL,
	"message" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"mentions" jsonb,
	"attachments" jsonb,
	"app_id" varchar(50),
	"result_preview" text,
	"result_metrics" jsonb,
	"task_title" varchar(255),
	"task_status" varchar(30),
	"task_assignee" varchar(100),
	"task_due_date" varchar(50),
	"pinned" integer DEFAULT 0 NOT NULL,
	"pinned_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_report_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"schedule_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"metrics_json" jsonb,
	"report_text" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"ai_model" varchar(100),
	"ai_input_tokens" integer,
	"ai_output_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_report_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"input_connection_id" integer NOT NULL,
	"input_provider" varchar(50) NOT NULL,
	"report_spec" jsonb DEFAULT '{}' NOT NULL,
	"output_type" varchar(50) DEFAULT 'telegram' NOT NULL,
	"output_connection_id" integer NOT NULL,
	"output_config" jsonb DEFAULT '{}' NOT NULL,
	"schedule_type" varchar(20) DEFAULT 'manual' NOT NULL,
	"cron_expression" varchar(100),
	"timezone" varchar(50) DEFAULT 'Asia/Ho_Chi_Minh',
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"last_success_at" timestamp,
	"locked_at" timestamp,
	"locked_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"from_user_id" integer,
	"from_user_name" varchar(100),
	"from_user_avatar" varchar(50) DEFAULT '👤',
	"message" text NOT NULL,
	"post_id" integer,
	"read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"importance_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"owner_employee_id" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"last_checked_at" timestamp,
	"activation_date" timestamp,
	"carrier" varchar(50),
	"line_type" varchar(20) DEFAULT 'mobile',
	"numverify_valid" integer DEFAULT 1,
	"registered_name" text,
	"registered_id" text,
	"registered_at" timestamp,
	"topup_cycle_days" integer DEFAULT 90,
	"last_topup_at" timestamp,
	"renewal_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_backup_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"backup_email" varchar(255) NOT NULL,
	"frequency" varchar(20) DEFAULT 'monthly' NOT NULL,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_check_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"checked_by" integer,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"check_type" varchar(20) DEFAULT 'manual',
	"risk_score_before" integer DEFAULT 0,
	"risk_score_after" integer DEFAULT 0,
	"notes" text,
	"status_after" varchar(20) DEFAULT 'safe',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"department" varchar(100),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_linked_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"platform_key" varchar(50) NOT NULL,
	"account_name" varchar(100) NOT NULL,
	"login_url" text,
	"username" varchar(150),
	"encrypted_password" text,
	"notes" text,
	"login_email" varchar(255),
	"linked_phone_asset_id" integer,
	"backup_email" varchar(255),
	"backup_phone_asset_id" integer,
	"owner_employee_id" integer,
	"importance_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"key" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"icon" varchar(10) DEFAULT '🔗',
	"color" varchar(20) DEFAULT '#6366F1',
	"is_default" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sim_risk_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"risk_type" varchar(50) NOT NULL,
	"risk_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"message" text NOT NULL,
	"resolved" integer DEFAULT 0,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolve_note" text,
	"dismissed" integer DEFAULT 0,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"version" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_announcement_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"announcement_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"size" varchar(50),
	"mime_type" varchar(100),
	"thumbnail_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "avatar" varchar(100);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "activated_apps" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "connect_hub_connections" ADD CONSTRAINT "connect_hub_connections_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_connections" ADD CONSTRAINT "connect_hub_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_mapping_configs" ADD CONSTRAINT "connect_hub_mapping_configs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_usage_logs" ADD CONSTRAINT "connect_hub_usage_logs_connection_id_connect_hub_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connect_hub_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_usage_logs" ADD CONSTRAINT "connect_hub_usage_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_link_codes" ADD CONSTRAINT "extension_link_codes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_link_codes" ADD CONSTRAINT "extension_link_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD CONSTRAINT "extension_tokens_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD CONSTRAINT "extension_tokens_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_report_runs" ADD CONSTRAINT "hero_report_runs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_report_runs" ADD CONSTRAINT "hero_report_runs_schedule_id_hero_report_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."hero_report_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_report_schedules" ADD CONSTRAINT "hero_report_schedules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_report_schedules" ADD CONSTRAINT "hero_report_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_report_schedules" ADD CONSTRAINT "hero_report_schedules_input_connection_id_connect_hub_connections_id_fk" FOREIGN KEY ("input_connection_id") REFERENCES "public"."connect_hub_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_report_schedules" ADD CONSTRAINT "hero_report_schedules_output_connection_id_connect_hub_connections_id_fk" FOREIGN KEY ("output_connection_id") REFERENCES "public"."connect_hub_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_assets" ADD CONSTRAINT "sim_assets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_assets" ADD CONSTRAINT "sim_assets_owner_employee_id_sim_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."sim_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_backup_configs" ADD CONSTRAINT "sim_backup_configs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_check_logs" ADD CONSTRAINT "sim_check_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_check_logs" ADD CONSTRAINT "sim_check_logs_asset_id_sim_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."sim_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_check_logs" ADD CONSTRAINT "sim_check_logs_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_employees" ADD CONSTRAINT "sim_employees_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_employees" ADD CONSTRAINT "sim_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_linked_accounts" ADD CONSTRAINT "sim_linked_accounts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_linked_accounts" ADD CONSTRAINT "sim_linked_accounts_linked_phone_asset_id_sim_assets_id_fk" FOREIGN KEY ("linked_phone_asset_id") REFERENCES "public"."sim_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_linked_accounts" ADD CONSTRAINT "sim_linked_accounts_backup_phone_asset_id_sim_assets_id_fk" FOREIGN KEY ("backup_phone_asset_id") REFERENCES "public"."sim_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_linked_accounts" ADD CONSTRAINT "sim_linked_accounts_owner_employee_id_sim_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."sim_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_platforms" ADD CONSTRAINT "sim_platforms_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_risk_events" ADD CONSTRAINT "sim_risk_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_risk_events" ADD CONSTRAINT "sim_risk_events_asset_id_sim_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."sim_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sim_risk_events" ADD CONSTRAINT "sim_risk_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_announcements" ADD CONSTRAINT "system_announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_announcement_reads" ADD CONSTRAINT "user_announcement_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_announcement_reads" ADD CONSTRAINT "user_announcement_reads_announcement_id_system_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."system_announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "connect_hub_mapping_configs_app_team_idx" ON "connect_hub_mapping_configs" USING btree ("app_slug","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_likes_post_user_idx" ON "feed_likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "feed_posts_team_idx" ON "feed_posts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "feed_posts_created_at_idx" ON "feed_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_team_idx" ON "activity_logs" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_user_team_idx" ON "team_members" USING btree ("user_id","team_id");