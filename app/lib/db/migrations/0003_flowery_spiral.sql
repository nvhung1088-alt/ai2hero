ALTER TABLE "notifications" ADD COLUMN "type" varchar(30);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "invitation_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;