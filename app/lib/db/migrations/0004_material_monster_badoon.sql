CREATE TABLE "agent_node_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"raw_title" text,
	"raw_content" text,
	"raw_metadata" jsonb,
	"raw_length" integer,
	"clean_length" integer,
	"source_url" text,
	"ai_summary" text,
	"ai_analysis" jsonb,
	"ai_model" varchar(50),
	"ai_tokens_used" integer,
	"tags" jsonb,
	"keywords" jsonb,
	"content_angles" jsonb,
	"tone" varchar(30),
	"language" varchar(10) DEFAULT 'vi',
	"content_ready" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_node_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"type" varchar(50) DEFAULT 'article' NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"ai_connection_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_flow_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_id" integer NOT NULL,
	"webhook_log_id" integer,
	"team_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"step_results" jsonb DEFAULT '[]' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_flow_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_id" integer NOT NULL,
	"step" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"app_slug" varchar(100) NOT NULL,
	"action_slug" varchar(255) NOT NULL,
	"input_mapping" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"webhook_id" uuid NOT NULL,
	"name" varchar(255) DEFAULT 'Flow tự động' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" uuid NOT NULL,
	"team_id" integer NOT NULL,
	"method" varchar(10) NOT NULL,
	"source_ip" varchar(45),
	"headers" jsonb DEFAULT '{}' NOT NULL,
	"raw_body" text,
	"parsed_payload" jsonb,
	"signature_valid" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_hub_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" integer NOT NULL,
	"app_slug" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"secret_hash" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"received_count" integer DEFAULT 0 NOT NULL,
	"last_received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dub_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo_url" text,
	"logo_position" varchar(50) DEFAULT 'top-left' NOT NULL,
	"intro_video_url" text,
	"outro_video_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dub_scan_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"folder_path" text NOT NULL,
	"interval_minutes" integer DEFAULT 60 NOT NULL,
	"source_lang" varchar(20) DEFAULT 'zh' NOT NULL,
	"target_lang" varchar(20) DEFAULT 'vi' NOT NULL,
	"asr_engine" varchar(50) DEFAULT 'faster-whisper' NOT NULL,
	"subtitle_mode" varchar(50) DEFAULT 'burn_subtitle' NOT NULL,
	"tts_enabled" boolean DEFAULT false NOT NULL,
	"tts_engine" varchar(50) DEFAULT 'edge-tts' NOT NULL,
	"tts_voice" varchar(100),
	"tts_speed" varchar(20),
	"bg_volume" varchar(20),
	"tts_volume" varchar(20),
	"output_folder" text,
	"ai_app_slug" varchar(100),
	"ai_model" varchar(100),
	"last_scan_at" timestamp,
	"scanned_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dub_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"input_type" varchar(10) DEFAULT 'url' NOT NULL,
	"source_url" text NOT NULL,
	"source_title" varchar(500),
	"source_platform" varchar(20),
	"source_video_id" varchar(100),
	"source_lang" varchar(10) DEFAULT 'zh' NOT NULL,
	"target_lang" varchar(10) DEFAULT 'vi' NOT NULL,
	"duration_sec" integer,
	"file_size_mb" integer,
	"source_thumbnail_url" text,
	"output_folder" text,
	"asr_engine" varchar(30) DEFAULT 'faster-whisper' NOT NULL,
	"translate_engine" varchar(30) DEFAULT 'connect-hub' NOT NULL,
	"llm_model" varchar(50),
	"subtitle_mode" varchar(20) DEFAULT 'burn_subtitle' NOT NULL,
	"quality_preset" varchar(10) DEFAULT 'balanced' NOT NULL,
	"tts_engine" varchar(30) DEFAULT 'edge-tts' NOT NULL,
	"tts_voice" varchar(100),
	"tts_enabled" boolean DEFAULT false NOT NULL,
	"tts_speed" varchar(10) DEFAULT '1.3' NOT NULL,
	"bg_volume" varchar(20),
	"tts_volume" varchar(20),
	"project_id" integer,
	"branding_enabled" boolean DEFAULT false NOT NULL,
	"logo_url" text,
	"logo_position" varchar(50) DEFAULT 'top-left' NOT NULL,
	"intro_video_url" text,
	"outro_video_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"progress" varchar(50),
	"speed" varchar(50),
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"worker_id" integer,
	"result_video_url" text,
	"result_srt_url" text,
	"result_preview" jsonb,
	"estimated_cost" integer,
	"actual_cost" integer,
	"dedupe_key" varchar(255),
	"logs" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dub_workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"device_name" varchar(100),
	"platform" varchar(20),
	"version" varchar(20),
	"status" varchar(20) DEFAULT 'offline' NOT NULL,
	"last_seen_at" timestamp,
	"access_token_hash" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_comment_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" varchar(20) DEFAULT 'like',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"user_id" integer NOT NULL,
	"image_url" text,
	"text_content" text,
	"bg_class" varchar(50),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"series_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"series_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"episode_number" integer NOT NULL,
	"title" varchar(255),
	"video_url" text NOT NULL,
	"video_source" varchar(20) DEFAULT 'direct' NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"is_free" boolean DEFAULT true NOT NULL,
	"token_price" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"series_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"series_id" integer NOT NULL,
	"episode_id" integer,
	"reason" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"creator_id" integer,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"cover_url" text,
	"banner_url" text,
	"trailer_url" text,
	"genre" varchar(100),
	"tags" jsonb,
	"total_episodes" integer DEFAULT 0 NOT NULL,
	"total_free_episodes" integer DEFAULT 0 NOT NULL,
	"director" varchar(255),
	"cast" text,
	"release_year" integer,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"feed_post_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"series_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"creator_team_id" integer NOT NULL,
	"token_amount" integer NOT NULL,
	"creator_amount" integer NOT NULL,
	"platform_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "film_watch_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"series_id" integer NOT NULL,
	"episode_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"watched_seconds" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"external_conversation_id" varchar(255) NOT NULL,
	"customer_id" integer,
	"chat_mode" varchar(20) DEFAULT 'hybrid' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"external_customer_id" varchar(255),
	"channel" varchar(50),
	"name" varchar(255),
	"phone" varchar(20),
	"email" varchar(255),
	"avatar" text,
	"tags" jsonb DEFAULT '[]',
	"notes" text,
	"total_conversations" integer DEFAULT 0,
	"total_orders" integer DEFAULT 0,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"inbox_id" integer,
	"conversation_id" integer,
	"event_type" varchar(50) NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_guardrails" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"inbox_id" integer,
	"rule_type" varchar(50) NOT NULL,
	"condition" jsonb NOT NULL,
	"action" varchar(20) DEFAULT 'handoff' NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_inboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"connection_id" integer,
	"webhook_id" uuid,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"system_prompt" text,
	"default_reply" text DEFAULT 'Hiện tại nhân viên đang bận, chúng tôi sẽ phản hồi sớm.' NOT NULL,
	"daily_message_limit" integer DEFAULT 50 NOT NULL,
	"daily_ai_call_limit" integer DEFAULT 20 NOT NULL,
	"daily_message_count" integer DEFAULT 0 NOT NULL,
	"daily_ai_call_count" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"conversation_id" integer NOT NULL,
	"external_message_id" varchar(255),
	"sender_id" varchar(255),
	"sender_name" varchar(255),
	"direction" varchar(20) NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]',
	"ai_status" varchar(20),
	"ai_confidence" integer,
	"used_snapshot_ids" jsonb DEFAULT '[]',
	"used_script_ids" jsonb DEFAULT '[]',
	"handoff_reason" text,
	"draft_content" text,
	"draft_status" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"inbox_id" integer,
	"trigger_text" text NOT NULL,
	"keywords" jsonb DEFAULT '[]',
	"negative_keywords" jsonb DEFAULT '[]',
	"trigger_examples" jsonb DEFAULT '[]',
	"intent" varchar(50),
	"confidence_threshold" integer DEFAULT 70,
	"reply_text" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_snapshot_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"entity_key" varchar(255) NOT NULL,
	"entity_name" varchar(255),
	"data" jsonb NOT NULL,
	"data_hash" varchar(64),
	"refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_care_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"inbox_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"refresh_interval_minutes" integer DEFAULT 15 NOT NULL,
	"max_stale_minutes" integer DEFAULT 60 NOT NULL,
	"allow_stale_fallback" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"config" jsonb DEFAULT '{}',
	"last_refreshed_at" timestamp,
	"next_refresh_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_social_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"source_post_id" integer,
	"content" text NOT NULL,
	"media_attachments" jsonb DEFAULT '[]',
	"video_format" varchar(20),
	"batch_id" varchar(50),
	"scheduled_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"target_platforms" jsonb DEFAULT '["isocial"]' NOT NULL,
	"connection_ids" jsonb DEFAULT '[]',
	"published_post_ids" jsonb DEFAULT '{}',
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"parent_id" integer,
	"icon" varchar(255),
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"buyer_user_id" integer,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"customer_address" text,
	"source" varchar(50) DEFAULT 'manual',
	"carrier" varchar(50),
	"tracking_number" varchar(255),
	"shipping_fee" integer DEFAULT 0,
	"discount" integer DEFAULT 0,
	"platform_fee" integer DEFAULT 0,
	"profit" integer DEFAULT 0,
	"print_count" integer DEFAULT 0 NOT NULL,
	"shipping_deadline" timestamp,
	"timeline" jsonb DEFAULT '[]',
	"return_reason" varchar(100),
	"return_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"category_id" integer,
	"name" varchar(500) NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"compare_price" integer,
	"images" jsonb DEFAULT '[]',
	"stock" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"sku" varchar(100),
	"cost_price" integer DEFAULT 0,
	"min_stock" integer DEFAULT 0,
	"reserved" integer DEFAULT 0,
	"avg_daily_sales" integer DEFAULT 0,
	"weight" integer DEFAULT 0,
	"ai_status" varchar(50) DEFAULT 'active',
	"tier_prices" jsonb DEFAULT '[]',
	"ai_config" jsonb DEFAULT '{}',
	"source_platform" varchar(50) DEFAULT 'manual',
	"source_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_shipping_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"connection_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"avatar_url" varchar(500),
	"cover_url" varchar(500),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" varchar(255),
	"status" varchar(50) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'VND' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_wallets_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"provider" varchar(30) DEFAULT 'upload',
	"original_url" text,
	"embed_url" text,
	"title" varchar(500),
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_conversation_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) DEFAULT 'direct' NOT NULL,
	"name" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_cross_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"platform_post_id" varchar(255),
	"platform_job_id" varchar(255),
	"connection_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metrics" jsonb,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_friends" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"addressee_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"status" varchar(20) DEFAULT 'approved' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"cover_url" text,
	"privacy" varchar(20) DEFAULT 'public' NOT NULL,
	"created_by" integer NOT NULL,
	"member_count" integer DEFAULT 1 NOT NULL,
	"require_join_approval" boolean DEFAULT false NOT NULL,
	"require_post_approval" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_imported_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"platform" varchar(50) NOT NULL,
	"external_post_id" varchar(255) NOT NULL,
	"external_url" text,
	"feed_post_id" integer,
	"raw_data" jsonb,
	"sync_status" varchar(20) DEFAULT 'synced',
	"synced_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) DEFAULT 'text' NOT NULL,
	"attachment_url" text,
	"attachments" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_page_followers" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"username" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(100),
	"website" text,
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"avatar_url" text,
	"cover_url" text,
	"owner_id" integer NOT NULL,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_pages_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "social_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bio" text,
	"cover_url" text,
	"location" varchar(200),
	"birthday" varchar(10),
	"website" varchar(500),
	"relationship" varchar(50),
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"last_active_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "social_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"reporter_id" integer NOT NULL,
	"post_id" integer,
	"comment_id" integer,
	"reason" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_agent_work_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"episodes_id" integer,
	"key" varchar(100),
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_art_styles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"file_url" text,
	"label" varchar(100),
	"prompt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"storyboard_id" integer NOT NULL,
	"file_path" text NOT NULL,
	"error_reason" text,
	"state" varchar(50) DEFAULT 'rendering' NOT NULL,
	"model" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"asset_id" integer,
	"file_path" text NOT NULL,
	"type" varchar(50),
	"model" varchar(100),
	"resolution" varchar(50),
	"state" varchar(50) DEFAULT 'generating' NOT NULL,
	"error_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_maker_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"script_id" integer,
	"image_id" integer,
	"asset_id" integer,
	"flow_id" integer,
	"name" varchar(255) NOT NULL,
	"prompt" text,
	"remark" text,
	"type" varchar(50) NOT NULL,
	"describe" text,
	"start_time" integer,
	"prompt_state" varchar(50),
	"audio_bind_state" integer,
	"prompt_error_reason" text,
	"derivative_metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_maker_assets_2_storyboards" (
	"asset_id" integer NOT NULL,
	"storyboard_id" integer NOT NULL,
	CONSTRAINT "video_maker_assets_2_storyboards_asset_id_storyboard_id_pk" PRIMARY KEY("asset_id","storyboard_id")
);
--> statement-breakpoint
CREATE TABLE "video_novels" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"chapter_index" integer NOT NULL,
	"reel" text,
	"chapter" text NOT NULL,
	"chapter_data" text NOT NULL,
	"event_state" integer DEFAULT 0 NOT NULL,
	"event" text,
	"error_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"scenes" jsonb DEFAULT '[]'::jsonb,
	"output_url" text,
	"output_storage" varchar(20),
	"render_device_id" integer,
	"total_duration" integer,
	"project_type" varchar(50),
	"image_model" varchar(100),
	"image_quality" varchar(50),
	"video_model" varchar(100),
	"intro" text,
	"type" varchar(50),
	"art_style" text,
	"director_manual" text,
	"mode" varchar(50),
	"video_ratio" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"data" text NOT NULL,
	"use_data" text
);
--> statement-breakpoint
CREATE TABLE "video_script_assets" (
	"script_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	CONSTRAINT "video_script_assets_script_id_asset_id_pk" PRIMARY KEY("script_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "video_scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"extract_state" integer DEFAULT 0 NOT NULL,
	"error_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_storyboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"script_id" integer,
	"prompt" text,
	"file_path" text,
	"duration" varchar(50),
	"state" varchar(50) DEFAULT 'generating' NOT NULL,
	"track_id" integer,
	"reason" text,
	"track" varchar(100),
	"video_desc" text,
	"should_generate_image" integer DEFAULT 1 NOT NULL,
	"flow_id" integer,
	"index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_class" varchar(100),
	"related_objects" text,
	"model" varchar(100),
	"describe" text,
	"state" varchar(50) DEFAULT 'pending' NOT NULL,
	"start_time" integer,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(255) NOT NULL,
	"custom_domain" varchar(255),
	"template_id" varchar(50) DEFAULT 'default' NOT NULL,
	"theme_config" jsonb,
	"linked_page_id" integer,
	"linked_profile_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "websites_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "websites_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "youtube_sync_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"creator_id" integer,
	"channel_url" text NOT NULL,
	"channel_name" varchar(255),
	"thumbnail_url" text,
	"filters" jsonb NOT NULL,
	"last_synced_at" timestamp,
	"total_synced" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "connect_hub_connections" ADD COLUMN "health_score" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "connect_hub_usage_logs" ADD COLUMN "tokens_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "connect_hub_usage_logs" ADD COLUMN "cost_usd" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "connect_hub_usage_logs" ADD COLUMN "model_name" varchar(255);--> statement-breakpoint
ALTER TABLE "connect_hub_usage_logs" ADD COLUMN "mvp_id" varchar(100);--> statement-breakpoint
ALTER TABLE "feed_comments" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD COLUMN "reaction_type" varchar(20) DEFAULT 'like';--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "visibility" varchar(20) DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "status" varchar(20) DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "page_id" integer;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "shared_post_id" integer;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "link_preview" jsonb;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "sync_website" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "website_category" varchar(100);--> statement-breakpoint
ALTER TABLE "feed_posts" ADD COLUMN "tagged_products" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_node_results" ADD CONSTRAINT "agent_node_results_task_id_agent_node_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_node_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_node_results" ADD CONSTRAINT "agent_node_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_node_tasks" ADD CONSTRAINT "agent_node_tasks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_node_tasks" ADD CONSTRAINT "agent_node_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flow_runs" ADD CONSTRAINT "connect_hub_flow_runs_flow_id_connect_hub_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."connect_hub_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flow_runs" ADD CONSTRAINT "connect_hub_flow_runs_webhook_log_id_connect_hub_webhook_logs_id_fk" FOREIGN KEY ("webhook_log_id") REFERENCES "public"."connect_hub_webhook_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flow_runs" ADD CONSTRAINT "connect_hub_flow_runs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flow_steps" ADD CONSTRAINT "connect_hub_flow_steps_flow_id_connect_hub_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."connect_hub_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flow_steps" ADD CONSTRAINT "connect_hub_flow_steps_connection_id_connect_hub_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connect_hub_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flows" ADD CONSTRAINT "connect_hub_flows_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_flows" ADD CONSTRAINT "connect_hub_flows_webhook_id_connect_hub_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."connect_hub_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_webhook_logs" ADD CONSTRAINT "connect_hub_webhook_logs_webhook_id_connect_hub_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."connect_hub_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_webhook_logs" ADD CONSTRAINT "connect_hub_webhook_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_hub_webhooks" ADD CONSTRAINT "connect_hub_webhooks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_projects" ADD CONSTRAINT "dub_projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_scan_configs" ADD CONSTRAINT "dub_scan_configs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_scan_configs" ADD CONSTRAINT "dub_scan_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_tasks" ADD CONSTRAINT "dub_tasks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_tasks" ADD CONSTRAINT "dub_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_tasks" ADD CONSTRAINT "dub_tasks_project_id_dub_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."dub_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_tasks" ADD CONSTRAINT "dub_tasks_worker_id_dub_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."dub_workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_workers" ADD CONSTRAINT "dub_workers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dub_workers" ADD CONSTRAINT "dub_workers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_bookmarks" ADD CONSTRAINT "feed_bookmarks_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_bookmarks" ADD CONSTRAINT "feed_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_comment_id_feed_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."feed_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_stories" ADD CONSTRAINT "feed_stories_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_stories" ADD CONSTRAINT "feed_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_bookmarks" ADD CONSTRAINT "film_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_bookmarks" ADD CONSTRAINT "film_bookmarks_series_id_film_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."film_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_episodes" ADD CONSTRAINT "film_episodes_series_id_film_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."film_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_episodes" ADD CONSTRAINT "film_episodes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_ratings" ADD CONSTRAINT "film_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_ratings" ADD CONSTRAINT "film_ratings_series_id_film_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."film_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_reports" ADD CONSTRAINT "film_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_reports" ADD CONSTRAINT "film_reports_series_id_film_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."film_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_reports" ADD CONSTRAINT "film_reports_episode_id_film_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."film_episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_series" ADD CONSTRAINT "film_series_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_series" ADD CONSTRAINT "film_series_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_series" ADD CONSTRAINT "film_series_feed_post_id_feed_posts_id_fk" FOREIGN KEY ("feed_post_id") REFERENCES "public"."feed_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_transactions" ADD CONSTRAINT "film_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_transactions" ADD CONSTRAINT "film_transactions_series_id_film_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."film_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_transactions" ADD CONSTRAINT "film_transactions_episode_id_film_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."film_episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_transactions" ADD CONSTRAINT "film_transactions_creator_team_id_teams_id_fk" FOREIGN KEY ("creator_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_watch_history" ADD CONSTRAINT "film_watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_watch_history" ADD CONSTRAINT "film_watch_history_series_id_film_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."film_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_watch_history" ADD CONSTRAINT "film_watch_history_episode_id_film_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."film_episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "film_watch_history" ADD CONSTRAINT "film_watch_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_conversations" ADD CONSTRAINT "hero_care_conversations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_conversations" ADD CONSTRAINT "hero_care_conversations_inbox_id_hero_care_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."hero_care_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_conversations" ADD CONSTRAINT "hero_care_conversations_customer_id_hero_care_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."hero_care_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_customers" ADD CONSTRAINT "hero_care_customers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_events" ADD CONSTRAINT "hero_care_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_events" ADD CONSTRAINT "hero_care_events_inbox_id_hero_care_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."hero_care_inboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_events" ADD CONSTRAINT "hero_care_events_conversation_id_hero_care_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."hero_care_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_guardrails" ADD CONSTRAINT "hero_care_guardrails_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_guardrails" ADD CONSTRAINT "hero_care_guardrails_inbox_id_hero_care_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."hero_care_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_inboxes" ADD CONSTRAINT "hero_care_inboxes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_inboxes" ADD CONSTRAINT "hero_care_inboxes_connection_id_connect_hub_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connect_hub_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_inboxes" ADD CONSTRAINT "hero_care_inboxes_webhook_id_connect_hub_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."connect_hub_webhooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_messages" ADD CONSTRAINT "hero_care_messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_messages" ADD CONSTRAINT "hero_care_messages_inbox_id_hero_care_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."hero_care_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_messages" ADD CONSTRAINT "hero_care_messages_conversation_id_hero_care_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."hero_care_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_scripts" ADD CONSTRAINT "hero_care_scripts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_scripts" ADD CONSTRAINT "hero_care_scripts_inbox_id_hero_care_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."hero_care_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_snapshot_items" ADD CONSTRAINT "hero_care_snapshot_items_snapshot_id_hero_care_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."hero_care_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_snapshot_items" ADD CONSTRAINT "hero_care_snapshot_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_snapshots" ADD CONSTRAINT "hero_care_snapshots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_care_snapshots" ADD CONSTRAINT "hero_care_snapshots_inbox_id_hero_care_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."hero_care_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_social_schedules" ADD CONSTRAINT "hero_social_schedules_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_social_schedules" ADD CONSTRAINT "hero_social_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_social_schedules" ADD CONSTRAINT "hero_social_schedules_source_post_id_feed_posts_id_fk" FOREIGN KEY ("source_post_id") REFERENCES "public"."feed_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_categories" ADD CONSTRAINT "marketplace_categories_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_shop_id_marketplace_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."marketplace_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_shop_id_marketplace_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."marketplace_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_category_id_marketplace_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."marketplace_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_shipping_configs" ADD CONSTRAINT "marketplace_shipping_configs_shop_id_marketplace_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."marketplace_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_shipping_configs" ADD CONSTRAINT "marketplace_shipping_configs_connection_id_connect_hub_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connect_hub_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_shops" ADD CONSTRAINT "marketplace_shops_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_shops" ADD CONSTRAINT "marketplace_shops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_wallet_id_marketplace_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."marketplace_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_wallets" ADD CONSTRAINT "marketplace_wallets_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_conversation_members" ADD CONSTRAINT "social_conversation_members_conversation_id_social_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."social_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_conversation_members" ADD CONSTRAINT "social_conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_cross_posts" ADD CONSTRAINT "social_cross_posts_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_cross_posts" ADD CONSTRAINT "social_cross_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_friends" ADD CONSTRAINT "social_friends_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_friends" ADD CONSTRAINT "social_friends_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_group_members" ADD CONSTRAINT "social_group_members_group_id_social_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."social_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_group_members" ADD CONSTRAINT "social_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_groups" ADD CONSTRAINT "social_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_imported_posts" ADD CONSTRAINT "social_imported_posts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_imported_posts" ADD CONSTRAINT "social_imported_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_imported_posts" ADD CONSTRAINT "social_imported_posts_feed_post_id_feed_posts_id_fk" FOREIGN KEY ("feed_post_id") REFERENCES "public"."feed_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_messages" ADD CONSTRAINT "social_messages_conversation_id_social_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."social_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_messages" ADD CONSTRAINT "social_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_page_followers" ADD CONSTRAINT "social_page_followers_page_id_social_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."social_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_page_followers" ADD CONSTRAINT "social_page_followers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_pages" ADD CONSTRAINT "social_pages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_profiles" ADD CONSTRAINT "social_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_comment_id_feed_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."feed_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_agent_work_data" ADD CONSTRAINT "video_agent_work_data_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_storyboard_id_video_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."video_storyboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_images" ADD CONSTRAINT "video_images_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_maker_assets" ADD CONSTRAINT "video_maker_assets_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_maker_assets_2_storyboards" ADD CONSTRAINT "video_maker_assets_2_storyboards_asset_id_video_maker_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."video_maker_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_maker_assets_2_storyboards" ADD CONSTRAINT "video_maker_assets_2_storyboards_storyboard_id_video_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."video_storyboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_novels" ADD CONSTRAINT "video_novels_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_projects" ADD CONSTRAINT "video_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_script_assets" ADD CONSTRAINT "video_script_assets_script_id_video_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."video_scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_script_assets" ADD CONSTRAINT "video_script_assets_asset_id_video_maker_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."video_maker_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_scripts" ADD CONSTRAINT "video_scripts_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_storyboards" ADD CONSTRAINT "video_storyboards_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_storyboards" ADD CONSTRAINT "video_storyboards_script_id_video_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."video_scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tasks" ADD CONSTRAINT "video_tasks_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_tracks" ADD CONSTRAINT "video_tracks_project_id_video_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."video_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_sync_channels" ADD CONSTRAINT "youtube_sync_channels_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_sync_channels" ADD CONSTRAINT "youtube_sync_channels_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dub_tasks_dedupe_key_idx" ON "dub_tasks" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_bookmarks_post_user_idx" ON "feed_bookmarks" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_comment_likes_comment_user_idx" ON "feed_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "feed_stories_team_idx" ON "feed_stories" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "feed_stories_expires_idx" ON "feed_stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "hero_care_cust_team_idx" ON "hero_care_customers" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "hero_care_cust_ext_idx" ON "hero_care_customers" USING btree ("external_customer_id");--> statement-breakpoint
CREATE INDEX "hero_care_events_team_idx" ON "hero_care_events" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "hero_care_events_processed_idx" ON "hero_care_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "hero_care_si_snapshot_idx" ON "hero_care_snapshot_items" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "hero_care_si_entity_idx" ON "hero_care_snapshot_items" USING btree ("entity_key");--> statement-breakpoint
CREATE UNIQUE INDEX "social_conv_members_idx" ON "social_conversation_members" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "social_friends_requester_idx" ON "social_friends" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "social_friends_addressee_idx" ON "social_friends" USING btree ("addressee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_friends_pair_idx" ON "social_friends" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_group_members_idx" ON "social_group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_imported_posts_external_idx" ON "social_imported_posts" USING btree ("connection_id","external_post_id");--> statement-breakpoint
CREATE INDEX "social_messages_conv_idx" ON "social_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "social_messages_created_idx" ON "social_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "social_page_followers_idx" ON "social_page_followers" USING btree ("page_id","user_id");--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_group_id_social_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."social_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_page_id_social_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."social_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");