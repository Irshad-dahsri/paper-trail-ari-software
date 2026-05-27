import { pgTable, index, pgPolicy, uuid, text, timestamp, varchar, integer, jsonb, foreignKey, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const paperTrailContracts = pgTable("paper_trail_contracts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	termsText: text("terms_text").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	index("idx_paper_trail_contracts_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_paper_trail_contracts_user_created").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	pgPolicy("paper_trail_contracts_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_contracts_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_contracts_rls_update", { as: "permissive", for: "update", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_contracts_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])

export const paperTrailInvoices = pgTable("paper_trail_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	contractId: uuid("contract_id").notNull(),
	invoiceText: text("invoice_text").notNull(),
	imageFilename: varchar("image_filename", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	index("idx_paper_trail_invoices_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_paper_trail_invoices_contract_id").using("btree", table.contractId.asc().nullsLast().op("uuid_ops")),
	index("idx_paper_trail_invoices_user_created").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
		columns: [table.contractId],
		foreignColumns: [paperTrailContracts.id],
		name: "paper_trail_invoices_contract_id_fkey",
	}).onDelete("cascade"),
	pgPolicy("paper_trail_invoices_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_invoices_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_invoices_rls_update", { as: "permissive", for: "update", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_invoices_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])

export const paperTrailAuditResults = pgTable("paper_trail_audit_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	invoiceId: uuid("invoice_id").notNull(),
	score: integer().notNull(),
	discrepanciesJson: jsonb("discrepancies_json").notNull().default(sql`'[]'::jsonb`),
	fixEmailDraft: text("fix_email_draft").notNull().default(''),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
	index("idx_paper_trail_audit_results_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_paper_trail_audit_results_invoice_id").using("btree", table.invoiceId.asc().nullsLast().op("uuid_ops")),
	index("idx_paper_trail_audit_results_user_created").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
		columns: [table.invoiceId],
		foreignColumns: [paperTrailInvoices.id],
		name: "paper_trail_audit_results_invoice_id_fkey",
	}).onDelete("cascade"),
	check("paper_trail_audit_results_score_check", sql`score >= 0 AND score <= 100`),
	pgPolicy("paper_trail_audit_results_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_audit_results_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_audit_results_rls_update", { as: "permissive", for: "update", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
	pgPolicy("paper_trail_audit_results_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])
