# Social Replies: scope audit and First Mate handover

Date: 2026-09-22. Repository: https://github.com/James-Bugden/Social-Replies-

## Completion boundary

The planning/research work is complete: the existing epic and all 20 child issues have been reviewed and expanded into implementation briefs. Research issue #3 is completed. The remaining 19 child issues are open implementation/verification work, not unfinished scoping placeholders. The epic stays open until the application passes its release gate.

This document is an audit/navigation record, not another product specification. The live issue bodies and linked contracts govern implementation. Do not recreate the issues or restart broad design discovery.

## Authoritative deliverables

- [Epic and implementation checklist](https://github.com/James-Bugden/Social-Replies-/issues/1)
- [Product specification](https://github.com/James-Bugden/Social-Replies-/blob/main/SOCIAL-REPLIES-IMPLEMENTATION-SPEC.md)
- [Issue index and dependency map](https://github.com/James-Bugden/Social-Replies-/blob/main/SOCIAL-REPLIES-GITHUB-ISSUES.md)
- [Completed Mobbin research](https://github.com/James-Bugden/Social-Replies-/blob/main/docs/design/mobbin-research.md)
- [UI interactions and copy](https://github.com/James-Bugden/Social-Replies-/blob/main/docs/design/interaction-spec.md)
- [Data, API, retrieval and recording contracts](https://github.com/James-Bugden/Social-Replies-/blob/main/docs/implementation/contracts.md)
- [Acceptance and evidence matrix](https://github.com/James-Bugden/Social-Replies-/blob/main/docs/testing/acceptance-matrix.md)
- [Synthetic design comparison](https://github.com/James-Bugden/Social-Replies-/blob/main/docs/design/prototype.html)

## Issue-by-issue scope check

For implementation issues, reviewed: specific outcome; responsibilities/interfaces; dependencies; applicable normal/error/race/privacy behaviour; exclusions; acceptance tests and evidence. UI issues additionally contain the relevant inspected Mobbin examples and the concrete behaviour to adopt or avoid.

| Issue | Scoped deliverable | Work state |
|---|---|---|
| #1 | Epic scope, exclusions, dependencies, checklist and release evidence | Implementation epic open |
| #2 | Scaffold, public-repo safeguards, CI and registration | Scoped; implementation open |
| #3 | Inspected Mobbin evidence and issue-specific recommendations | Research complete |
| #4 | Compact reference-first components and Orca validation | Scoped; implementation open |
| #5 | Owner-only auth/RLS, schema and shared transaction contracts | Scoped; implementation open |
| #6 | Verified resource data, URL/locale/CTA resolution | Scoped; implementation open |
| #7 | Approved public-safe facts and eligibility | Scoped; implementation open |
| #8 | Resumable private import and identity-safe deduplication | Scoped; implementation open |
| #9 | Platform/Drive adapters and source-specific coverage | Scoped; real-source work depends on available exports |
| #10 | Hybrid bilingual retrieval and durable embedding updates | Scoped; implementation open |
| #11 | Independent resource qualification and no-match/error states | Scoped; implementation open |
| #12 | Versioned model/fake services and bounded provider usage | Scoped; implementation open |
| #13 | Platform voice and version-linked Threads English meaning | Scoped; implementation open |
| #14 | Grounding, injection and repetition guards | Scoped; implementation open |
| #15 | Narrow shell, source/comment context and draft recovery | Scoped; implementation open |
| #16 | Literal historical replies and independent resource cards | Scoped; implementation open |
| #17 | Three ideas, protected editor, previews/Undo and meaning freshness | Scoped; implementation open |
| #18 | Exact atomic recording, clipboard, idempotency and daily counts | Scoped; implementation open |
| #19 | Library and minimal resource/fact administration | Scoped; implementation open |
| #20 | Independent test campaign and private AI evaluation | Scoped; verification work open |
| #21 | Isolated deployment and promoted-build verification | Scoped; deployment work open |

The live issue index links every issue. Checkbox state refers to completed implementation, not whether its specification has been written.

## Corrections verified during the final pass

1. Research is delivered, not left as a task telling First Mate to use Mobbin. Issue #3 now links the actual committed report, interaction contract and comparison.
2. Old research.md/directions.html links and conflicting design letters in the research handoff were corrected. Current recommendation is compact reference-first, B in the committed comparison. It is not claimed as owner approval.
3. The short issue-bootstrap manifest was replaced by an index of the complete live briefs and integration dependencies. The epic now marks research complete and links the current contracts.
4. The schema uses a single provenance/date/evidence vocabulary. Resource origin is separate from app origin. Unknown historical dates are not fabricated as today.
5. Issue #13 now links technical C08 and interaction D09 to their correct separate files/anchors.
6. Resource insertion, dirty editor replacement, translation staleness, clipboard denial, repeated saves and lost responses have concrete behaviour and test ownership rather than vague feature bullets.
7. The environment template contains blank credential/private values. Public-repository rules cover issues, PRs, logs, screenshots and fixtures as well as source files.

## Mobbin research actually supplied

The report describes eight individually inspected screens and three rendered preview frames of one nine-screen flow. It explicitly distinguishes observed screen content from proposed product behaviour and states which frames were not inspected.

Buffer informs contextual rewrites and explicit proposal acceptance. Superhuman informs readable metadata/excerpt rows. WRITER informs independently identifiable resource cards. Other references cover source context, secondary review information and rejected long-form AI interfaces. The specific canonical Mobbin URLs and adopt/avoid decisions are in issue #3, the research report and the affected feature issues.

No paid screenshots, expiring image URLs or private Drive exports are republished. A screenshot is not proof of backend persistence, accessible interaction or productivity improvements.

## First Mate: start here

Read AGENTS.md, the current product specification, the issue index and the linked contracts. Consume completed research #3. Begin #2 and the synthetic component work in #4; do not wait for production API keys to make a prototype or typed fake service.

Publish #5 shared contracts before independent registry/facts/import work. Keep #9 source-specific real backfill moving when exports are available without blocking the whole product. Use the index's dependency boundaries: #17 owns the editor interface, #18 owns recording/corrections and #19 consumes those services.

Build the first end-to-end slice with synthetic data, then integrate authorised private resources/history. QA starts as interfaces stabilise. File defects, continue unblocked tests and retest fixes in the relevant environment. Do not close feature issues based only on documentation or a static prototype.

Do not change Soar production, root-domain/mail DNS, paid account settings or privacy scope incidentally. App target remains replies.jamesbugden.com. Secrets and actual owner/source/evaluation data stay outside public GitHub.

## Not claimed complete

No production application, live historical backfill, actual owner authentication, private model-quality benchmark, Orca review, real HTTPS clipboard/device verification, deployed security configuration or production rollout is claimed complete by this scoping handover. Those remain explicitly owned by the open implementation/verification issues.

No reliable elapsed-time promise is made. First Mate should measure the first slice and report real blockers rather than treating earlier speculative hour estimates as a deadline.
