# Social Replies: completed planning and scope audit

Reviewed 2026-09-22. Scope: the existing public repository, epic #1, implementation issues #2-#21, product specification and connected design/voice sources. This is a planning/research completion record, not an application release report.

## What changed

All 21 existing issue bodies were reviewed and updated in place. The live issue readback contains concrete outcomes, implementation responsibilities, shared contracts, dependencies, exclusions, failure cases, acceptance tests and required evidence. No duplicate issues were created. Research #3 is completed; the epic and actual implementation/validation issues remain open.

The old monolithic conceptual spec was replaced with a coherent product authority linking the detailed design, copy, data/API and test contracts. The GitHub backlog remains the same 20 work items plus epic, but is no longer a set of short feature checklists.

## Gaps resolved

| Earlier gap | Resolution and owner |
|---|---|
| Research still assigned as future work | Inspected Mobbin report with observations, adopt/avoid decisions and direct issue mappings; #3 completed |
| Unpublished research/prototype paths and inconsistent direction letters | Committed mobbin-research.md, interaction-spec.md and prototype.html; compact reference-first is B in this comparison, #4 validates components |
| Vague resource suggestions | Independent resource section, eligibility, canonical link resolution, no-match/error distinction and safe CTA insertion; #6 #11 #16 |
| Ambiguous old drafts treated as voice truth | Canonical provenance and separate publication evidence, import aliases only, accurate historical labels; #5 #8 #9 #10 |
| Unknown dates becoming today's replies | Date precision retained, no import-time substitution, derived Taipei counts; #8 #9 #18 |
| Text-hash dedupe could merge different replies | Strong event identity for import and operation UUID/payload fingerprint for save; #8 #18 |
| Provider results could overwrite edits | Version-linked async results, explicit previews, Keep my reply and Undo; #15 #17 |
| English review text could become stale | Meaning linked to the exact Chinese hash and invalidated on edits/CTA changes; #13 #17 |
| Save cleared text too early or depended on embeddings | Commit before success, preserve failed/uncertain drafts, durable outbox and immediate lexical search; #10 #18 |
| UI auth without direct DB/RPC proof | Owner restriction at API and DB, child ownership constraints, anonymous/non-owner tests; #5 #20 |
| App domain assumed to be resource origin | Independent blank RESOURCE_BASE_URL with deployment verification; #6 #21 |
| Agent speed/model claims treated as guarantees | Actual provider verification/benchmark and measured first-slice forecasting, not speculative inherited prices/hours; #12 #20 |
| QA merely said test the flow | 38 named test contracts with inputs, outcomes, owners and environment/evidence gates |

## Mobbin evidence

The report covers eight individual screen images and three rendered preview frames from one nine-screen flow. Actual observations are distinguished from proposed implementation behaviour. An inbox was not called a search flow; a quote-style composer was not called the ordinary reply flow; unrendered Notion steps were not inferred. No licensed screen exports or expiring image URLs are republished.

The compact reference-first layout is an implementation recommendation derived from the stated two-window workflow and inspected patterns. It is not an assertion of owner approval, a usability study or improved engagement.

## Local prototype verification actually performed

Command: `python scripts/check-prototype.py`.

Environment: local headless Chromium 144.0.7559.96, Playwright `set_content`, synthetic data, clipboard stub. Ten checks passed, zero page errors:

- no horizontal page overflow, three idea controls and resources present in the visible document at widths 375, 500, 600, 750 and 1280;
- dirty text preserved when choosing another idea;
- stale translation notice after an edit, exact clipboard payload through the stub, no copy count;
- synthetic failed save retains text and repeated recording counts once;
- no-resource and failed-lookup messages differ;
- tabbed comparison hides resources, while the recommended comparison does not.

The checks do not prove native clipboard permissions, real translation, model quality, server/database atomicity, multi-tab persistence, full keyboard/zoom accessibility, Orca, physical Safari or production deployment. The synthetic HTML implements selected states, not the complete production contract. Those gates remain open in #4 and #20/#21.

## Public-file and consistency checks

A scoped text scan of the deliverable files found no key-like values, JWT-like tokens, private-key blocks, email addresses, private Drive URLs or expiring Mobbin image URLs. Credential/private values in .env.example are blank. Synthetic resources use example.com. This was not a full forensic Git-history audit or a gitleaks run, and does not claim repository security settings were enabled.

Local deliverable bytes were compared using Git blob SHA-1 to the committed core documents, prototype, README, AGENTS.md, SECURITY.md, environment template and issue index. All matched. Relative Markdown links resolved locally. The index contains 21 unique existing issues and the acceptance matrix contains 38 unique test IDs.

## Remaining implementation, not unfinished planning

First Mate still must build the application, configure authorised private credentials/data, validate actual source adapters and model quality, perform Orca/device checks where required and deploy/verify the promoted build. Missing private exports block only the affected backfill, not the synthetic engineering work. Do not reopen broad design discovery or close production issues merely because the planning package is complete.

[Product specification](../../SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md) · [Issue index](../../SOCIAL-REPLIES-GITHUB-ISSUES.md) · [Research](../design/mobbin-research.md) · [Prototype checks](../design/prototype-checks.json) · [Acceptance matrix](../testing/acceptance-matrix.md)
