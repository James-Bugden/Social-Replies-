# Social Replies: completed Mobbin research

Revision 2. Reviewed 2026-09-22. This is research evidence and a design recommendation, not a claim that the production app exists or that James approved a mockup.

## Method and limits

The connected Mobbin MCP was used to search for rewrite controls, a narrow assistant, message lists, source cards and a composer. The returned images were visually inspected. Searches sometimes returned a different app or screen type from the query. The observations below describe the returned images, not the search terms.

Eight individual screens and the three rendered preview frames of one nine-screen flow inform this report. The unrendered Notion frames were not inspected. No user study or conversion improvement is claimed. Screens establish visible UI patterns, not hidden persistence, keyboard, accessibility or error behaviour. Those behaviours are specified and tested separately for this product.

Mobbin assets are not redistributed in this public repository. Canonical links are retained. Do not embed expiring image URLs or copy another product's branding, screenshots, text or code into the application.

## MB-01: Buffer, contextual rewrite actions

[Open the inspected Buffer actions screen](https://mobbin.com/screens/376b5f5b-faef-4d7d-bd35-d2ddca223377)

Observed: the editable post remains on the left. A right-hand AI Assistant shows explicit actions including writing more, rephrasing, shortening and expanding. The composer and assistant are separate surfaces.

Adopt: offer a small set of contextual text actions next to Your reply. The user does not need to invent a prompt for routine edits. Keep the current draft visible while a replacement is proposed.

Do not copy: Instagram-specific options, scheduling, media controls, the large modal or a permanent second column at 600 px.

Implementation: SR-012 #13 and SR-016 #17. Actions initially are Shorter, More direct and Warmer. Resource removal appears only with an inserted resource. Personal-example actions require an eligible approved fact. Preview a rewrite before replacing human edits.

## MB-02: Buffer, proposed text and explicit insertion

[Open the inspected Buffer suggestion screen](https://mobbin.com/screens/2c403df8-7cf9-4753-9e73-9c5bf0087bd5)

Observed: the assistant contains a separate proposed-text card with Retry and Insert controls. The original editor remains visible. Smaller rewrite controls sit beneath the proposal.

Adopt: distinguish generated text from the final editable reply. Use this selects an alternative. Apply rewrite accepts a refinement. A model completion must not silently overwrite the editor.

Do not copy: the purple assistant theme, product warnings verbatim, hashtags or promotional copy. The screenshot does not prove undo behaviour; our undo/version rules are independent requirements.

Implementation: SR-016 #17 and SR-017 #18. Keep the previous editor version for Undo. Discard results based on an old editor version. Switching alternatives while the editor is dirty shows a replacement preview with Keep my reply and Replace reply.

## MB-03: Superhuman Mail, compact message rows

[Open the inspected Superhuman inbox screen](https://mobbin.com/screens/d2d1e92d-cb09-4acf-8ff0-b58f9145152b)

Observed: a dense message list aligns sender, subject/snippet and date. The view includes group headings and a separate Recent Opens area. This is an inbox image, not evidence of a search-results flow.

Adopt: align platform/provenance metadata, reply excerpt and date in predictable rows. Show three matches initially, with two-line excerpts and an explicit expansion control.

Do not copy: the full inbox, tiny mail density, right activity rail, bulk-selection tools or single-line truncation for Chinese replies.

Implementation: SR-009 #10, SR-015 #16 and SR-018 #19. Neutral metadata, readable 16 px reply text, a full-text expansion and Copy text preserve useful context without a dashboard.

## MB-04: WRITER, independently visible source cards

[Open the inspected WRITER sources screen](https://mobbin.com/screens/4a222df9-9ae9-40a0-972f-b0be9bfaa12f)

Observed: the main response is separate from a Sources panel. Individual source cards display a domain, title and short excerpt. A Sources control also remains near the answer.

Adopt: make Useful things you can share its own section. Each result has a title, type, one-line fit explanation and explicit Add to reply / Copy link actions. A reply idea can additionally show Includes: [resource].

Do not copy: an always-open right rail, six-plus cards, external-source-first ranking or an assumption that a citation is suitable promotional material.

Implementation: SR-005 #6, SR-010 #11 and SR-015 #16. Search only the approved registry. Show at most three qualified matches, with owned resources preferred among relevant matches. A good no-link result stays visible. Resource lookup must work when generation fails.

## MB-05: ChatGPT, source inspection separate from the answer

[Open the inspected ChatGPT citations screen](https://mobbin.com/screens/88d5e839-cf2b-447b-887c-a4beeead8040)

Observed: an answer occupies the centre. A separate citations panel lists source domains, titles and snippets. A sources affordance also appears below the answer.

Adopt: provide an optional Why this matches disclosure for supporting detail rather than exposing model internals or raw similarity percentages.

Do not copy: the long report, sidebar history, source count as a trust score, or the implication that sources were independently verified by a screenshot.

Implementation: SR-010 #11 and SR-015 #16. The explanation is limited to supplied registry metadata. Verification status comes from stored evidence, not generated confidence. Use visible section cards, not a hidden rail, at narrow width.

## MB-06: Threads, composer with retained source context

[Open the inspected Threads composer screen](https://mobbin.com/screens/df90832b-7512-41c6-8fe7-cd416fd55280)

Observed: a New thread composer includes an embedded source post under the entered text, with Cancel and Post controls. This is a quote-style composer, not proof of the ordinary reply flow.

Adopt: retain a compact source post/comment and an Open original link while drafting. Support an optional parent-post context when replying to another comment.

Do not copy: its Post button, public publishing behaviour, media preview, modal overlay or platform navigation. Social Replies never publishes in v1.

Implementation: SR-014 #15 and SR-017 #18. Copy reply copies only. Mark posted records the user's confirmation. Keep the distinction visible, including after an error.

## MB-07: Grammarly, voice controls away from the document

[Open the inspected Grammarly voice screen](https://mobbin.com/screens/373843b6-21a6-42f4-8b80-9c8dda50bd0a)

Observed: a document stays readable while a My voice side panel presents formality, tone, profession and language controls.

Adopt: secondary language/voice information must not crowd the editable text. For Threads, English meaning is an expandable, version-linked review aid below Chinese text.

Do not copy: the tone setup wizard, emoji chips, profession entry, scoring or a model/voice picker. Voice is already defined by the owner's private canonical references.

Implementation: SR-012 #13 and SR-016 #17. Editing Chinese invalidates its old English meaning. Refresh English meaning never changes the Chinese text.

## MB-08: Notion, in-context AI text treatment

[Open the inspected Notion flow](https://mobbin.com/flows/6a605e50-2f18-4da3-b8f7-3f17c45515d0)

Observed in rendered frames 1, 5 and 9 only: a document starts with an empty content area; a later frame highlights inserted text with a nearby AI status/control strip; the last preview is a normal document page. Other steps were not visible in this review.

Adopt: keep changes attached to the text they affect and return attention to the editor after accepting them. Use lightweight success status rather than another workflow page.

Do not copy: automatic whole-document replacement, block-editor complexity, workspace navigation or a claim that every flow step was checked.

Implementation: SR-016 #17. Highlight the proposed replacement, apply it explicitly, then restore editor focus. The production implementation must prove focus and undo behaviour in tests.

## MB-09: Jasper, negative reference

[Open the inspected Jasper screen](https://mobbin.com/screens/718f6ff6-da20-4ae5-a2ad-3ce1da2e9618)

Observed: the screen contains conversation history, completed generation steps and an input showing Original and Enhanced prompt text. This is not the simple three-alternative reply selector needed here.

Reject for the primary layout: prompt-engineering controls, long assistant narration and multi-step agent progress would add work to a two-window reply routine.

Implementation: SR-014 #15. No prompt editor, model selector, task narration or chat transcript. Show real retrieval/generation states only.

## Selected direction: B, compact reference-first workspace

Direction A is a plain stack of fully expanded cards. It is easy to understand but makes three old replies, three resources, three ideas and translations consume too much height.

Direction B keeps the required order, shows compact history excerpts, keeps resources independently visible, and places only the small action strip at the bottom. The editor itself stays in normal flow at narrow width. This is the recommended implementation default for the user's two-window workflow, not a claim of user approval.

Direction C uses tabs for previous replies, resources and ideas. It reduces height but hides the very resources the user explicitly wants to see. Do not use it as the default.

[Interaction and copy specification](interaction-spec.md) defines exact behaviour. [Coded comparison](prototype.html) shows all three directions with synthetic data. It is a design prototype, not a functioning model-backed app.

## Private design-source reconciliation

The existing design-rules document, locked product voice chart and writing/reply references were consulted. Only derived implementation decisions are published here; private document exports and locators are not.

Preserve paper-led surfaces, deep green actions/selected states, neutral metadata, hairline grouping, restrained gold and aligned tabular counters. Use Geist with Noto Sans TC fallback for Chinese in the actual app. The self-contained prototype uses local font fallbacks and does not redistribute fonts.

The older marketing-page rules are adapted explicitly: no hero, oversized footer, mandatory decorative gold word or multiple dark panels in this utility. The existing 2 px hover vocabulary applies only to wholly interactive cards, not cards containing selectable text and several buttons. The relevant buttons get hover/focus styling instead. This is a documented product adaptation, not an assertion that the old brand document already prescribes it.

UI copy follows the product voice chart. Generated social replies follow the separate personal writing/reply rules. Do not transfer a formal product-register rule into casual Threads replies.

## Handoff and completion evidence

The research requested by SR-002 #3 is now supplied. Do not spend another build ticket rediscovering the same references. Reopen research only for a specific unresolved interaction or a changed requirement.

SR-003 #4 owns implementation validation of direction B, including Orca review. A local prototype check is not Orca, physical Safari, production QA, a language benchmark or proof of better engagement. Those remain explicit build gates.
