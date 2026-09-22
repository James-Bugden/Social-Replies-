# Social Replies: completed design research

Date: 2026-09-22. Status: research complete; implementation and owner usability validation are not complete.

## What was actually reviewed

The Mobbin MCP was used to inspect eleven returned screen previews and representative previews from two flows. The observations below refer to visible pixels, not search-result descriptions. Only flow frames actually shown are discussed. A shipped screen is a design reference, not evidence that its pattern improves this user's performance.

Private Drive sources checked include `design-rules.md`, the locked `HireSign Voice Chart`, and `Follow This Writing Style.md`. The earlier design-system token specification and reply-style source remain the baseline references. Private files and their contents are not reproduced here. Source-derived observations and our product-specific recommendations are separated below.

The chosen implementation direction is **A: stacked workspace with an in-flow editor and a compact action bar**. This is a recommendation grounded in the stated two-window workflow, not a claim that the owner has approved or usability-tested it. Issue #4 owns browser implementation and validation of this direction.

## Mobbin observations and their application

### M01. Buffer: AI suggestion beside a draft
[Open the inspected screen](https://mobbin.com/screens/ff1e037e-1a9f-4bd3-8264-45189fe6ec0e)

Observed: a narrow AI panel contains a prompt, a generated text card, Retry and Insert controls, and small rewrite controls. A separate, larger draft stays visible beside it.

Adopt: keep AI proposals distinct from the editable final reply. Make applying a proposal explicit. Put refinement actions close to the text they affect.

Do not copy: two fixed side-by-side internal panels inside a 600 px window, the modal backdrop, or the purple AI visual identity.

Implementation: #12 generation contract, #17 proposal/preview editor. A returned rewrite never silently replaces user edits.

### M02. Buffer: existing text remains visible during a rewrite
[Open the inspected screen](https://mobbin.com/screens/2c403df8-7cf9-4753-9e73-9c5bf0087bd5)

Observed: the composer contains an existing post. The right AI panel shows a small source excerpt, a generated alternative, Retry and Insert, followed by refinement buttons.

Adopt: tie each proposal to the exact draft revision that produced it. Keep the current reply readable while reviewing an alternative.

Do not copy: publishing, scheduling, image uploading, channel management, or hashtags from the sample content.

Implementation: #13 translation source hash, #17 revision-safe refinement, #18 copy/post separation.

### M03. Buffer: task-specific writing controls
[Open the inspected screen](https://mobbin.com/screens/376b5f5b-faef-4d7d-bd35-d2ddca223377)

Observed: a short list offers specific actions such as rephrasing and shortening for the selected platform, next to the existing composer.

Adopt: offer Shorter, More direct and Warmer as actions, with other actions under More. The user should not need to write another prompt to perform a common edit.

Do not copy: every available action at once. Do not treat action labels as mandatory categories for the three reply ideas.

Implementation: #13 allowed action IDs, #17 contextual controls.

### M04. Evernote: query and compact contextual results
[Open the inspected screen](https://mobbin.com/screens/46926538-2111-4bed-8396-4db69c067660)

Observed: the search query remains visible above compact matching note-title rows. Matching terms are emphasised and notebook context appears as secondary text. The screenshot does not establish body-snippet search quality.

Adopt: keep the query visible, emphasise actual lexical matches, and separate reply content from provenance/date metadata. Expand a result to read the complete original.

Do not copy: the full application sidebar, the full-screen modal, or a user-facing Standard versus AI search mode switch.

Implementation: #10 hybrid search, #16 historical results, #19 library.

### M05. Evernote: a useful state before searching
[Open the inspected screen](https://mobbin.com/screens/3120a6eb-313c-492d-96f2-63b5656c80be)

Observed: before a query, recent notes are grouped under Today and Yesterday, with a search input above them.

Adopt: the Library opens with recent saved replies before a query. Missing historical dates get Date unknown, not a fabricated Today label.

Do not copy: date grouping in the main reply workspace when relevance should drive ordering.

Implementation: #8 import date precision, #19 recent Library state.

### M06. X: composing and then seeing a posted reply
[Open the inspected flow](https://mobbin.com/flows/c4ef4158-5f5d-4556-8200-260ccea63125)

Observed frames: 1, 3 and 4 of 4. Frame 3 keeps the target post and reply relationship above the draft in a composer. Frame 4 shows the resulting reply in the conversation. Frame 2 was not inspected.

Adopt: preserve the immediate target, including when it is a comment under a larger post. Make draft, copied, and recorded-as-posted distinct states.

Do not copy: a Reply or Send button that would falsely imply Social Replies publishes to X. No GIF or media composer in v1.

Implementation: #15 target/context inputs, #18 Mark posted and owner-attested evidence.

### M07. Notion: identifiable resource cards
[Open the inspected screen](https://mobbin.com/screens/74b3a02c-d1f3-4631-9bcf-593c8f4c44fe)

Observed: related template cards have names, previews and metadata, grouped separately from the current item. Add and Preview for the current template are explicit actions in the header. The screen does not show a personalised explanation for each recommendation.

Adopt: resources must be identifiable objects with their own title, type and actions, rather than disappearing inside generated prose. Our one-sentence reason for relevance is a Social Replies design decision, not something proven by this screen.

Do not copy: large preview thumbnails, ratings, marketplace promotion or multi-column galleries in the narrow workspace.

Implementation: #6 registry fields, #11 matching, #16 resource cards and explicit Add to reply.

### M08. Superhuman Mail: answer support and follow-up controls
[Open the inspected screen](https://mobbin.com/screens/1c7f58bb-ad65-4669-acb0-ccac0b6ba581)

Observed: an AI answer is followed by a Sources disclosure and short suggested follow-up controls. A separate tips rail uses substantial width. This is an AI-answer screen, not the plain search-result list requested in the search query.

Adopt: a quiet Based on disclosure can expose source record types for a suggestion. Do not expose internal reasoning. Keep the primary text unencumbered.

Do not copy: the long conversational answer, the tips rail, or presenting generated summaries as literal historical replies.

Implementation: #14 provenance/fact guards, #17 source disclosure.

### M09. Notion: an AI change close to document content
[Open the inspected flow](https://mobbin.com/flows/6a605e50-2f18-4da3-b8f7-3f17c45515d0)

Observed frames: 1, 5 and 9 of 9. Frame 5 shows newly added/highlighted text and a compact AI status/action area next to it. The remaining intermediate steps were not inspected.

Adopt: identify what text a proposed change affects and keep feedback local. Social Replies adds an explicit preview-and-apply contract so a late response cannot overwrite current work.

Do not copy: block editing, document covers, long-form content or assumptions about unseen undo behaviour.

Implementation: #17 preview, Apply this version, Keep my reply, and local undo.

### M10. Threads: quoted context inside a composer
[Open the inspected screen](https://mobbin.com/screens/df90832b-7512-41c6-8fe7-cd416fd55280)

Observed: this is a New thread/quote composer, with an embedded source card below newly written text. It is not evidence of the native reply workflow requested by the search.

Adopt narrowly: retain enough visible source context to prevent replying to the wrong thing.

Do not copy: quote-post semantics, the large media card, or the Post action. The X flow is the stronger reply-state reference.

Implementation: #15 source-context disclosure. This reference does not justify adding quote publishing.

## Results not used as primary references

The [Threads permissions menu](https://mobbin.com/screens/24bcf713-c1cd-4062-bf5b-3710e57e6962) is about audience controls, not reply drafting. The [Superhuman inbox](https://mobbin.com/screens/dea1a047-1c66-4679-957b-e0720ce38a85) is too dense for this task and does not show the requested search journey. The [Notion creator promotion screen](https://mobbin.com/screens/cfa500e0-8651-4217-8004-836d71f06c69) is a marketplace promotion, not a useful resource-insertion pattern. These are excluded rather than described as supporting evidence.

## Three layout directions compared

| Direction | Structure | Benefit | Cost | Decision |
|---|---|---|---|---|
| A. Stacked workspace | Source, compact history, resources, reply ideas, editor; small sticky action bar | All four answers remain discoverable without mode switching; suits the 500–750 px window | Requires vertical scrolling | Recommended v1 direction |
| B. Editor first | Source and editor first, supporting material below | Fast for predominantly manual writing | Hides the history and resource features the owner explicitly prioritised | Keep as a comparison, not the default |
| C. Tabbed support | History / Resources / Ideas tabs above the editor | Shorter page | Resources become invisible until a tab is opened; frequent tab switching | Reject for v1 |

The accompanying `directions.html` demonstrates these alternatives using synthetic content. It is a design fixture, not the application. Choosing A here does not close #4: the actual component implementation still needs responsive, keyboard and Orca review.

## Product-specific decisions

- D01: start at 600 px, then verify 500 and 750 px. No permanent sidebar.
- D02: keep resources independently visible; do not add them only as an AI variant.
- D03: keep historical records, generated ideas and editable final text visually distinct.
- D04: every AI rewrite is a proposal; apply it explicitly and protect newer edits.
- D05: Copied does not mean Posted. Recording a post is an owner statement, not an API verification.
- D06: opening English meaning must never change the copied language. Refresh its meaning after Chinese edits.
- D07: at narrow widths only the action bar may stick. The textarea stays in document flow.
- D08: no forced disagreement, invented personal example, or automatic promotional link.
- D09: selected state uses green and text; metadata is neutral. Gold is decorative, not body text.
- D10: preserve the current draft until save succeeds and the owner chooses Next reply.

## Drive source application and boundaries

The approved page rules support restrained paper/green/gold, white text on dark surfaces, fixed count alignment and one consistent hover treatment. The utility adaptation deliberately does not copy marketing hero sizes or large section bands. Selectable actions may change border colour; text-only historical cards do not move when the user selects text.

The locked UI Voice Chart supports sentence-case action labels, calm errors and quiet success. It is not the personal social-reply voice. The current writing-style and reply-style sources govern generated social text. This distinction avoids making casual Threads replies sound like product error messages.

## External accessibility constraints

Use [WCAG 2.2 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) when checking the action bar: focused controls must not be hidden by it. Our design target is full visibility, stronger than the minimum criterion.

[WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) sets a 24 by 24 CSS px minimum with exceptions. Social Replies chooses 44 px core buttons and at least 32 px secondary controls with spacing as a product target, not as a claim that WCAG requires 44 px for all controls.

## Research-to-issue handoff

| Issue | Decisions/references | Concrete consequence |
|---|---|---|
| #4 | D01, D07, M01–M10 | Implement direction A and inspect three sizes |
| #6, #11 | D02, M07 | Structured resources, explicit matching and no-match state |
| #10, #19 | M04, M05 | Query-preserving search and honest date/provenance metadata |
| #12–#14 | D03, D04, D06, D08 | Validated alternatives, versioned translation, grounding |
| #15 | D01, D07, M06, M10 | Compact shell and immediate target context |
| #16 | D02, D03, M04, M07 | Separate history/resources with specific actions |
| #17 | D03, D04, D06, M01–M03, M08–M09 | Preview/apply, contextual refinements and English disclosure |
| #18 | D05, D10, M06 | Honest copy/save lifecycle and recovery |
| #20 | All | State-based visual and accessibility test matrix |

## Publication and limitations

Only canonical Mobbin links and original observations are committed. No paid screen exports, expiring image URLs, private Drive documents, real comment archives or credentials are published. The preview review is complete. Production usability, actual AI quality, screen-reader behaviour and real-device clipboard behaviour still require implementation evidence.
