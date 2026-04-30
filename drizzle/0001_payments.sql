CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice" text NOT NULL,
	"sender_alien_id" text NOT NULL,
	"recipient_address" text NOT NULL,
	"amount" text NOT NULL,
	"token" text NOT NULL,
	"network" text NOT NULL,
	"product_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_intents_invoice_unique" UNIQUE("invoice")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_alien_id" text,
	"recipient_address" text NOT NULL,
	"tx_hash" text,
	"status" text NOT NULL,
	"amount" text,
	"token" text,
	"network" text,
	"invoice" text,
	"test" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
