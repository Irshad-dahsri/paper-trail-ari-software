Module Name
Paper Trail — Contract-Aware Audit Engine

Description
Paper Trail is an AI-native audit engine built into ARI that protects you from being overcharged. Most expense tools just categorize receipts — Paper Trail reads your actual contracts and cross-references them against incoming invoices to catch billing errors before you pay.

The Problem It Solves
Freelancers, small businesses, and finance teams routinely overpay vendors because invoice review is manual, slow, and error-prone. A vendor bills $85/hr when the contract says $75/hr. They charge 25 hours when the cap is 20. They expense a $145 Uber with no receipt. These errors slip through because nobody has time to read the contract every time an invoice arrives. Paper Trail makes this instant and automatic.

How It Works
Step 1 — Store your contract terms
Navigate to Paper Trail → Contracts → New Contract. Paste the billing terms from any agreement: hourly rates, weekly hour caps, expense limits, receipt requirements, what's excluded.
Step 2 — Submit an invoice
Navigate to Invoices → New Invoice. Select which contract it belongs to and paste the invoice text. Optionally attach a receipt image (JPEG, PNG, WebP, or PDF up to 10MB).
Step 3 — Run the audit
Click Run Audit. The AI cross-references the invoice against your contract terms and performs four checks:

Rate Mismatch — Did they charge more per hour than agreed?
Overbilling — Did they exceed weekly hour caps or milestone limits?
Missing Receipt — Is there an expense line with no supporting receipt?
Policy Violation — Did they bill for something explicitly excluded in the contract?

Step 4 — Review the Audit Report
Instantly see an Audit Score (0–100), a discrepancy table with severity levels (high/medium/low) and dollar impact for each issue found, and a professionally written Fix Pack email draft ready to send to the vendor.
Step 5 — Track history
Every audit is saved. Navigate to Audit History to review past audits, compare scores over time, and see how vendors improve (or don't).

Key Features

Audit Score — 0 to 100 calculated by formula (starts at 100, subtracts 25 per high severity issue, 15 per medium, 5 per low). Consistent and explainable every time.
Discrepancy Table — Color-coded by severity with exact dollar impact per issue.
Fix Pack Email — AI-generated vendor correction email, one click to copy.
Dashboard Widget — Total audits run, average score, count of Action Required audits at a glance.
Full Audit History — Every audit preserved, never overwritten.
Secure by default — All data scoped to your user via Row Level Security. Nobody else can see your contracts or audits.
Uses ARI's Anthropic integration — No separate API key setup. Configure once in Settings → Integrations and every module benefits.


Real-World Example
Contract terms: $75/hr, max 20hrs/week, travel capped at $100 with receipt required, no software licenses covered.
Invoice received: 25hrs @ $85/hr, $145 Uber (no receipt), $54.99 Adobe license, weekend support billing.
Paper Trail catches: rate mismatch ($250 overcharge), hour cap exceeded ($375 overbilling), missing receipt ($145 unsubstantiated), travel cap violation ($45 over limit), policy violation (software license not covered), weekend billing violation. Audit Score: 0/100. Fix Pack email generated in seconds.

Installation

Copy modules-custom/paper-trail/ into your ARI installation's modules-custom/ folder
Restart ARI — the database tables are created automatically on first enable
Go to Settings → Features → find Paper Trail → toggle ON
Go to Settings → Integrations → add your Anthropic API key
Navigate to Paper Trail in the sidebar and start auditing


Tech Stack
Built on ARI's module system using Next.js, TypeScript, Drizzle ORM, TanStack Query, and Anthropic Claude. Database tables use PostgreSQL with Row Level Security. File storage via ARI's built-in file system.
