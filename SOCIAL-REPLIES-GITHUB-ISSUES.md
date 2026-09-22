# Social Replies: scoped issue index

Revision 2, 2026-09-22. The existing epic and 20 issues are retained, not recreated. Each live issue contains outcome, implementation scope/contracts, exclusions, acceptance tests and evidence requirements. This index owns navigation/dependencies, not a competing copy of every issue body.

[Product authority](SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md) · [Design research](docs/design/mobbin-research.md) · [UI/copy contract](docs/design/interaction-spec.md) · [Technical contracts](docs/implementation/contracts.md) · [Acceptance matrix](docs/testing/acceptance-matrix.md)

## Existing issues and integration dependencies

| ID / issue | Deliverable | Integration prerequisites | Phase |
|---|---|---|---|
| [SR-EPIC #1](https://github.com/James-Bugden/Social-Replies-/issues/1) | Complete authenticated single-user product | Required implementation and release evidence | All |
| [SR-001 #2](https://github.com/James-Bugden/Social-Replies-/issues/2) | Scaffold, public-repo policy and CI | None | M0 |
| [SR-002 #3](https://github.com/James-Bugden/Social-Replies-/issues/3) | Completed inspected Mobbin research | None; supplied research is not scaffold-dependent | M0 |
| [SR-003 #4](https://github.com/James-Bugden/Social-Replies-/issues/4) | Component design and Orca validation | #3; #2 for application components | M0 |
| [SR-004 #5](https://github.com/James-Bugden/Social-Replies-/issues/5) | Owner-only schema/auth/shared contracts | #2 | M0 |
| [SR-005 #6](https://github.com/James-Bugden/Social-Replies-/issues/6) | Registry and verified resource resolver | #5 | M1 |
| [SR-006 #7](https://github.com/James-Bugden/Social-Replies-/issues/7) | Approved public-safe Fact Bank | #5 | M1 |
| [SR-007 #8](https://github.com/James-Bugden/Social-Replies-/issues/8) | Resumable private import framework | #5 | M1 |
| [SR-008 #9](https://github.com/James-Bugden/Social-Replies-/issues/9) | Source-specific adapters and coverage | #8 plus actual authorised sources per adapter | M1 |
| [SR-009 #10](https://github.com/James-Bugden/Social-Replies-/issues/10) | Bilingual hybrid retrieval/outbox worker | #5 and #8 contract, not completed #9 backfill | M1 |
| [SR-010 #11](https://github.com/James-Bugden/Social-Replies-/issues/11) | Resource qualification/no-link states | #6 #10 | M1 |
| [SR-011 #12](https://github.com/James-Bugden/Social-Replies-/issues/12) | Provider/fake adapter and versioned API | #5 #10 #11 for integration | M2 |
| [SR-012 #13](https://github.com/James-Bugden/Social-Replies-/issues/13) | Platform voice and Threads meaning | #12 #7 | M2 |
| [SR-013 #14](https://github.com/James-Bugden/Social-Replies-/issues/14) | Grounding/repetition/security guards | #6 #7 #12 #13 | M2 |
| [SR-014 #15](https://github.com/James-Bugden/Social-Replies-/issues/15) | Narrow workspace and session state | #2 #4 #5 | M2 |
| [SR-015 #16](https://github.com/James-Bugden/Social-Replies-/issues/16) | Prior writing and visible resources | #10 #11 #15; shared editor interface from #17 | M2 |
| [SR-016 #17](https://github.com/James-Bugden/Social-Replies-/issues/17) | Alternatives/editor/translation freshness | #13 #14 #15; fake contracts allow earlier UI work | M2 |
| [SR-017 #18](https://github.com/James-Bugden/Social-Replies-/issues/18) | Exact idempotent recording/counters | #5 #17; transaction tests can start earlier | M2 |
| [SR-018 #19](https://github.com/James-Bugden/Social-Replies-/issues/19) | Library and minimal administration | #6 #7 #10 #15; correction interface from #18 | M2 |
| [SR-019 #20](https://github.com/James-Bugden/Social-Replies-/issues/20) | Independent quality/release gate | Integrated #2 and #4-#19; tests start in parallel | M3 |
| [SR-020 #21](https://github.com/James-Bugden/Social-Replies-/issues/21) | Production promotion and smoke | #20 for promotion; preview discovery after #2/#5 | M3 |

These prerequisites define integration, not a demand to serialize all engineering. Publish shared contracts early and use fake providers/synthetic fixtures for independent UI work. There is no SR-000 dependency. Missing source exports block only that adapter's real validation/backfill. Do not silently claim it complete or block the whole app.

## Status and design decision

Research artifacts are supplied. #3 is the research-only completion record. #4 remains open for actual component/Orca validation. The production implementation issues remain open until their required evidence exists.

Compact reference-first is the selected default, labelled B in the current comparison. Earlier issue drafts used different letters and unpublished filenames. Use the committed interaction specification and prototype, not those old labels. The reference-first order and independently visible resources are fixed; no owner approval or measured conversion improvement is implied.

## Work assignment

Foundation and design-validation work can start together. Schema then unlocks registry, facts and importer primitives. Retrieval/provider/UI can advance against shared fake contracts. QA owns a separate campaign ledger and continues independent tests while fix workers work. The public issue evidence must be synthetic or sanitised.

Phase names M0-M3 and priorities in issue bodies are planning metadata. They are not a claim that GitHub milestone objects or label automation were created. First Mate may apply actual repository labels/milestones through its supported tools without making their absence a build blocker.

## Public repository boundary

No API keys, tokens, owner account identifiers, private source locators, real reply exports, private Drive contents, raw provider prompts, production logs or sensitive screenshots in issues, commits, tests or artifacts. Use blank templates and synthetic examples. The private app database and source/evaluation stores hold real data.
