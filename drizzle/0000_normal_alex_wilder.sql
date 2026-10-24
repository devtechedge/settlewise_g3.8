CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"actor_uid" text NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"reason" text,
	"metadata_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"before_snapshot" text NOT NULL,
	"after_snapshot" text NOT NULL,
	"reason" text NOT NULL,
	"actor_uid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"allocation_method" text DEFAULT 'EQUAL' NOT NULL,
	"allocated_minor_units" bigint NOT NULL,
	"share_weight" integer,
	"basis_points" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"occurrence_date" text NOT NULL,
	"payer_participant_id" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"amount_minor_units" bigint NOT NULL,
	"notes" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"void_reason" text,
	"voided_at" timestamp,
	"voided_by_uid" text,
	"creator_uid" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"export_format" text DEFAULT 'CSV' NOT NULL,
	"filter_params" text,
	"checksum" text NOT NULL,
	"creator_uid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_uid" text NOT NULL,
	"canonical_currency" text DEFAULT 'USD' NOT NULL,
	"currency_precision" integer DEFAULT 2 NOT NULL,
	"budget_minor_units" bigint,
	"budget_period" text DEFAULT 'monthly',
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"file_name" text NOT NULL,
	"checksum" text NOT NULL,
	"column_mapping" text NOT NULL,
	"status" text DEFAULT 'PREVIEW' NOT NULL,
	"duplicate_policy" text DEFAULT 'SKIP' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"creator_uid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"source_row_json" text NOT NULL,
	"normalized_date" text,
	"normalized_description" text,
	"normalized_amount_minor_units" bigint,
	"normalized_payer_name" text,
	"fingerprint" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"committed_expense_id" text
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"token" text NOT NULL,
	"inviter_uid" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_uid" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"linked_user_uid" text,
	"color" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"storage_ref" text NOT NULL,
	"uploaded_by_uid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_uid" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settlement_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"sender_participant_id" text NOT NULL,
	"recipient_participant_id" text NOT NULL,
	"amount_minor_units" bigint NOT NULL,
	"recorded_date" text NOT NULL,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"notes" text,
	"idempotency_key" text,
	"creator_uid" text NOT NULL,
	"reversal_reason" text,
	"reversed_at" timestamp,
	"reversal_of_payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"photo_url" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_revisions" ADD CONSTRAINT "expense_revisions_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_revisions" ADD CONSTRAINT "expense_revisions_actor_uid_users_uid_fk" FOREIGN KEY ("actor_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payer_participant_id_participants_id_fk" FOREIGN KEY ("payer_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voided_by_uid_users_uid_fk" FOREIGN KEY ("voided_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_creator_uid_users_uid_fk" FOREIGN KEY ("creator_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_records" ADD CONSTRAINT "export_records_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_records" ADD CONSTRAINT "export_records_creator_uid_users_uid_fk" FOREIGN KEY ("creator_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_uid_users_uid_fk" FOREIGN KEY ("owner_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_creator_uid_users_uid_fk" FOREIGN KEY ("creator_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_uid_users_uid_fk" FOREIGN KEY ("inviter_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_uid_users_uid_fk" FOREIGN KEY ("user_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_linked_user_uid_users_uid_fk" FOREIGN KEY ("linked_user_uid") REFERENCES "public"."users"("uid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_metadata" ADD CONSTRAINT "receipt_metadata_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_metadata" ADD CONSTRAINT "receipt_metadata_uploaded_by_uid_users_uid_fk" FOREIGN KEY ("uploaded_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_uid_users_uid_fk" FOREIGN KEY ("user_uid") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_sender_participant_id_participants_id_fk" FOREIGN KEY ("sender_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_recipient_participant_id_participants_id_fk" FOREIGN KEY ("recipient_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_payments" ADD CONSTRAINT "settlement_payments_creator_uid_users_uid_fk" FOREIGN KEY ("creator_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_group_idx" ON "audit_events" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_events" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "revision_expense_idx" ON "expense_revisions" USING btree ("expense_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_participant_split_idx" ON "expense_splits" USING btree ("expense_id","participant_id");--> statement-breakpoint
CREATE INDEX "split_participant_idx" ON "expense_splits" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "expense_group_idx" ON "expenses" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "expense_payer_idx" ON "expenses" USING btree ("payer_participant_id");--> statement-breakpoint
CREATE INDEX "expense_date_idx" ON "expenses" USING btree ("group_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "import_batch_idx" ON "import_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_fingerprint_idx" ON "import_rows" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "group_user_idx" ON "memberships" USING btree ("group_id","user_uid");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "memberships" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "participant_group_idx" ON "participants" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "payment_group_idx" ON "settlement_payments" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "payment_sender_idx" ON "settlement_payments" USING btree ("sender_participant_id");--> statement-breakpoint
CREATE INDEX "payment_recipient_idx" ON "settlement_payments" USING btree ("recipient_participant_id");