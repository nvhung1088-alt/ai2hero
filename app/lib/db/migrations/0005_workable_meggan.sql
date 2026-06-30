CREATE TABLE "downloader_cookies" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"cookie_data" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloader_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"platform" varchar(50) NOT NULL,
	"source_url" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"total_videos" integer DEFAULT 0 NOT NULL,
	"downloaded_videos" integer DEFAULT 0 NOT NULL,
	"last_scan_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloader_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"max_concurrent_downloads" integer DEFAULT 3 NOT NULL,
	"max_concurrent_scans" integer DEFAULT 2 NOT NULL,
	"default_download_path" text,
	"auto_start_worker" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloader_videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"video_url" text NOT NULL,
	"title" varchar(500),
	"author" varchar(255),
	"thumbnail_url" text,
	"duration" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"download_speed" varchar(50),
	"local_path" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "downloader_cookies" ADD CONSTRAINT "downloader_cookies_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloader_projects" ADD CONSTRAINT "downloader_projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloader_projects" ADD CONSTRAINT "downloader_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloader_settings" ADD CONSTRAINT "downloader_settings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloader_videos" ADD CONSTRAINT "downloader_videos_project_id_downloader_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."downloader_projects"("id") ON DELETE cascade ON UPDATE no action;