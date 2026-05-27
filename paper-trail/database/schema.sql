-- Paper Trail schema
-- Idempotent: safe to run on every module enable.
-- Mirrors modules-custom/paper-trail/database/schema.ts

CREATE TABLE IF NOT EXISTS paper_trail_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(200) NOT NULL,
  terms_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_trail_contracts_user_id ON paper_trail_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trail_contracts_user_created ON paper_trail_contracts(user_id, created_at DESC);

ALTER TABLE paper_trail_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS paper_trail_contracts_rls_select ON paper_trail_contracts;
CREATE POLICY paper_trail_contracts_rls_select ON paper_trail_contracts FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_contracts_rls_insert ON paper_trail_contracts;
CREATE POLICY paper_trail_contracts_rls_insert ON paper_trail_contracts FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_contracts_rls_update ON paper_trail_contracts;
CREATE POLICY paper_trail_contracts_rls_update ON paper_trail_contracts FOR UPDATE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_contracts_rls_delete ON paper_trail_contracts;
CREATE POLICY paper_trail_contracts_rls_delete ON paper_trail_contracts FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));


CREATE TABLE IF NOT EXISTS paper_trail_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  contract_id UUID NOT NULL REFERENCES paper_trail_contracts(id) ON DELETE CASCADE,
  invoice_text TEXT NOT NULL,
  image_filename VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paper_trail_invoices_user_id ON paper_trail_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trail_invoices_contract_id ON paper_trail_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_paper_trail_invoices_user_created ON paper_trail_invoices(user_id, created_at DESC);

ALTER TABLE paper_trail_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS paper_trail_invoices_rls_select ON paper_trail_invoices;
CREATE POLICY paper_trail_invoices_rls_select ON paper_trail_invoices FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_invoices_rls_insert ON paper_trail_invoices;
CREATE POLICY paper_trail_invoices_rls_insert ON paper_trail_invoices FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_invoices_rls_update ON paper_trail_invoices;
CREATE POLICY paper_trail_invoices_rls_update ON paper_trail_invoices FOR UPDATE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_invoices_rls_delete ON paper_trail_invoices;
CREATE POLICY paper_trail_invoices_rls_delete ON paper_trail_invoices FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));


CREATE TABLE IF NOT EXISTS paper_trail_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  invoice_id UUID NOT NULL REFERENCES paper_trail_invoices(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  discrepancies_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  fix_email_draft TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT paper_trail_audit_results_score_check CHECK (score >= 0 AND score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_paper_trail_audit_results_user_id ON paper_trail_audit_results(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trail_audit_results_invoice_id ON paper_trail_audit_results(invoice_id);
CREATE INDEX IF NOT EXISTS idx_paper_trail_audit_results_user_created ON paper_trail_audit_results(user_id, created_at DESC);

ALTER TABLE paper_trail_audit_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS paper_trail_audit_results_rls_select ON paper_trail_audit_results;
CREATE POLICY paper_trail_audit_results_rls_select ON paper_trail_audit_results FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_audit_results_rls_insert ON paper_trail_audit_results;
CREATE POLICY paper_trail_audit_results_rls_insert ON paper_trail_audit_results FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_audit_results_rls_update ON paper_trail_audit_results;
CREATE POLICY paper_trail_audit_results_rls_update ON paper_trail_audit_results FOR UPDATE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS paper_trail_audit_results_rls_delete ON paper_trail_audit_results;
CREATE POLICY paper_trail_audit_results_rls_delete ON paper_trail_audit_results FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));
