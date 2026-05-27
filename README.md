# Paper Trail — Contract-Aware Audit Engine for ARI

An AI-native module that catches vendor overbilling by cross-referencing 
invoices against your actual contract terms.

## The Problem
Freelancers and businesses overpay vendors because invoice review is manual. 
A vendor bills $85/hr when the contract says $75/hr. They charge 25 hours 
when the cap is 20. These errors slip through every time.

## How It Works

### 1. Store Your Contract
Paste your billing terms once — rates, hour caps, expense limits, exclusions.

### 2. Submit an Invoice  
Paste the invoice text and attach receipt images if available.

### 3. Run the Audit
Claude cross-references the invoice against your contract and checks for:
- **Rate Mismatch** — charged more per hour than agreed
- **Overbilling** — exceeded hour caps or milestone limits  
- **Missing Receipt** — expense with no supporting receipt
- **Policy Violation** — billed for something explicitly excluded

### 4. Review the Report
- **Audit Score** 0–100 (100 = clean, 0 = major violations)
- **Discrepancy Table** with severity and exact dollar impact
- **Fix Pack Email** — professional vendor correction email, one click to copy

### 5. Track History
Every audit is saved. Review past audits and track vendor improvement over time.

## Demo Example
**Contract:** $75/hr, max 20hrs/week, travel capped at $100 with receipt required, 
no software licenses covered.

**Invoice received:** 25hrs @ $85/hr + $145 Uber (no receipt) + $54.99 Adobe license 
+ weekend billing.

**Result:** Audit Score 0/100 — 6 discrepancies flagged, $800+ in billing errors caught, 
Fix Pack email generated in seconds.

## Installation
1. Copy `paper-trail/` into your ARI `modules-custom/` folder
2. Restart ARI — database tables created automatically on first enable
3. Go to Settings → Features → toggle Paper Trail ON
4. Go to Settings → Integrations → add your Anthropic API key
5. Navigate to Paper Trail in the sidebar

## Tech Stack
Next.js · TypeScript · Drizzle ORM · PostgreSQL + RLS · 
TanStack Query · Anthropic Claude · ARI Module System

## Built at ARI.HACK — Toronto Tech Week 2026
