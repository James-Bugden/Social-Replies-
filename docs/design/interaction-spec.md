# Social Replies: interaction and UI copy specification

Revision 2, 2026-09-22. Implementation default: direction B. The decision is based on the user's stated two-window workflow and the [inspected Mobbin research](mobbin-research.md), not a claim of a usability study or owner approval.

## D01. Layout and density

Design at 600 x 900 CSS px first. Required narrow checks: widths 500, 600 and 750. Also check 375 as a responsive fallback and 1280 as a wide desktop view. No horizontal page scroll at these sizes. At 200% zoom, content reflows and every action remains reachable.

At widths below 1100: one document column, 16 px side gutters, 12 px card padding, 16 px reply text, 13 px metadata, 1.6 line-height for Chinese, 12-16 px section gaps. The source collapses to two lines after retrieval but stays expandable. Show three two-line history excerpts with full-text expansion. Keep at least the strongest resource fully visible and expose additional matches with Show 2 more resources. No resources are hidden behind the ideas tab.

Only the compact Copy reply / Mark posted action strip may stick to the bottom. Reserve its measured height plus 16 px as bottom padding. Do not pin a large textarea over results. At short viewport heights, or where virtual-keyboard behaviour is not verified, put the strip in document flow. Jump to your reply is available when the editor is offscreen. At 1100+ px, a second column may hold the editor without changing source order or behaviour.

## D02. Header and brand application

Use a compact app title and a text-labelled menu for Library, Resources, Facts and Settings. Counters use full platform names and tabular numerals. Let them wrap to a second row rather than shrinking text. Show 0/10 for each platform, not fake seeded completion.

Use paper #FDFBF7, paper-alt #F4F1E9, white cards, ink #0E0E0E, secondary text #5C5C5C, green #0A3F2C, selected green-soft #E5EFEA and neutral hairlines #E7E3D8. Gold #B08A3E is decorative only, not small body text or the only status indicator. Use a darker dedicated input/focus border where the pale brand hairline fails contrast. The token file must document this accessibility adaptation.

Actual app typography: Geist for English/UI, Noto Sans TC for Chinese, with readable local fallbacks. Do not package unrelated font files in evidence. No hero, illustration, gradient, floating assistant avatar or score widget. Cards containing selectable text and multiple actions stay still on hover. Buttons receive the consistent hover/focus treatment.

## D03. Source and intent

Label: Paste the post or comment you're replying to. Optional Post link and Add parent-post context fields preserve what the user is responding to. A post and a comment are both valid targets. No URL or author is required. A URL alone is not fetched: ask for its text. Recognise known platform hosts for a suggested selection but allow override.

Get reply ideas and Cmd/Ctrl+Enter start retrieval and generation. Empty/whitespace input produces Paste the post or comment first. Preserve raw text; any normalised search copy is separate.

Search by keyword is a small secondary mode for finding saved replies/resources. Its action is Search my replies and resources. It does not invent a third-party post. Show Paste a post or comment to get tailored reply ideas when only a keyword is supplied. Switching back retains the keyword as an optional hint, not as fabricated source context.

## D04. Required result hierarchy

Source -> Your past replies -> Useful things you can share -> Reply ideas -> Your reply.

Use the long history heading You've replied to similar posts before only for confirmed posted replies. Draft-only results sit under Saved writing, with their provenance stated. Do not show You said this before above an AI draft. The compact navigation label may remain Your past replies.

Retrieval renders before generation completes. Each section has its own loading, ready, genuinely empty and failed state. A model outage must not hide a usable resource or past reply.

## D05. Historical result row

Show platform, known date or Date unknown, provenance, an exact excerpt and expansion control. Full text stays selectable. Use this idea adds a cited seed to the current session and requests a new suggestion, without replacing the editor. Copy text copies that historical text exactly. Show more matches fetches the next page without resetting the editor.

Drafts and published main posts remain searchable but are labelled and never asserted to be a posted comment. Long Chinese text wraps normally. No numeric similarity badges.

## D06. Resource cards and insertion

Always keep Useful things you can share visible. Each qualified card contains its real registry title, type, language/availability when relevant, a one-sentence fit explanation, Add to reply and Copy link. A book without a verified URL has Add recommendation, not a broken Copy link button. Advice-only is a result state, not a fake resource row.

Add to reply inserts only a canonical URL and an approved or generated-and-validated CTA. It must not rewrite the rest of the draft. With an empty editor it may insert the CTA alone and leave the user in the editor. Adding the same resource again is a no-op with Already added. Adding a different one previews replacement of the existing resource block, rather than silently accumulating links. Default one resource per reply, with explicit user editing always preserved.

Remove resource removes the exact untouched inserted block. If the user edited that block, show a removal preview instead of deleting surrounding text. Copy link never increments a reply counter. Generated ideas with a resource show Includes: [title] and removal is available in the editor.

Do not imply Free, no signup, a particular chapter or a promised result unless that metadata is verified in the registry. A missing Chinese version is labelled English resource, not silently described as Chinese.

## D07. Reply idea cards

Normal success returns exactly three validated alternatives. Each displays its complete text, a short label explaining the actual difference and Use this. Labels are contextual, for example Shorter, Practical next step or Recruiter perspective. They are not three mandatory modes. Do not manufacture disagreement or fabricate a personal anecdote to fill a slot.

A subtle Suggested marker is optional. All three remain equally readable. With resource is valid only when that card actually contains an eligible resource. Similar content under different labels fails the differentiation check. On validation failure show an actionable retry, not three empty cards.

## D08. Final editor and transformations

The editor is always available for manual writing, including before generation and during outages. Source, generation run, editor and translation each carry versions. An async result may update suggestions but never replace current editor text without an explicit user action.

Use this fills an empty/pristine editor. If the user has edited it, show the proposed replacement inline with Replace reply and Keep my reply. Keep a reversible previous version for Undo. Shorter, More direct and Warmer produce previews with Apply rewrite. Typing while a refinement runs makes its response stale; do not apply it. Do not disable normal editing while the provider runs.

Add a personal example is visible only with an eligible approved public-safe fact. Library selections, resource insertions, platform changes and restored drafts obey the same no-silent-overwrite rule.

## D09. Threads and English meaning

Chinese text is the posting text. Every generated Threads idea has an expandable English meaning. The final editor has its own English meaning tied to an exact Chinese text hash. Changing Chinese text, inserting a CTA or accepting a rewrite invalidates that translation immediately.

Stale copy: Your reply changed. Refresh the English meaning. Action: Refresh English meaning. Refreshing translates the latest text without changing it. If the user edits during translation, discard the old response. A translation failure never disables manual copy/save. Copy reply copies Chinese only, never the English review text, labels or metadata.

The UI remains English in v1. Personal Threads replies follow Taiwan wording and the owner's private reply rules, not the formal register of the product UI chart.

## D10. Copy, record and next reply

Copy reply awaits clipboard success before displaying Copied. If denied, select the editor text and show Couldn't copy automatically. Select the text and copy it. Do not claim success or change daily progress. Do not read the clipboard in the background.

Copying and posting are different. Mark posted records the user's confirmation; it does not call a social platform. Helper: Post it in your feed, then mark it posted here. If you changed the reply in the feed, paste that final version here first.

Show Edited since copy when relevant, without blocking a user who manually copied the final text. Save only the submitted exact editor snapshot. Disable repeat submission while pending; an idempotency key also protects the server. Do not clear the draft until durable success. On failure keep it and offer Retry save using the same operation key. An unknown network result is checked before resubmitting.

After success show Saved. [Platform] [n]/[target] today. with Undo recorded status and Next reply. The saved text remains available until Next reply. Undo reverses the app's record/count, not the real social post. Next reply clears working text only after save/discard is resolved and returns focus to source input. Preserve the platform preference.

## D11. Add past reply

A compact dialog contains Platform, Your reply, optional Original post/comment, optional Post link and Posted date. Date can be Unknown; never turn an undated import into a reply posted today. This route also supports replies written entirely outside the app.

The user confirms it was posted. Save it as user-confirmed evidence, not platform-verified evidence. Handle duplicate detected records with a preview. Cancel preserves the active workspace. Closing the dialog restores focus to its trigger.

## D12. State-specific UI copy

| State | Copy | Action/result |
|---|---|---|
| Initial | What are you replying to? | Source input, Get reply ideas |
| Empty input | Paste the post or comment first. | Focus input |
| History loading | Checking your past replies... | Keep source and editor |
| No history | No matching past replies yet. | Continue with ideas/manual reply |
| History unavailable | Couldn't search past replies. | Retry search |
| Resource lookup ready, none qualified | Nothing worth linking for this one. | Continue without link |
| Resource lookup failed | Couldn't check your resources. | Retry resources |
| Resource catalog empty | Add your first resource to find it here. | Open Resources, preserve draft |
| Generation loading | Drafting reply ideas... | Editing remains available |
| Generation failed | Couldn't create reply ideas. Your draft is unchanged. | Try again |
| Rate limit | Reply ideas are temporarily paused. Your draft is unchanged. | Retry after server-provided wait |
| Rewrite ready | Review this version before replacing your reply. | Apply rewrite / Keep my reply |
| Translation stale | Your reply changed. Refresh the English meaning. | Refresh English meaning |
| Copy success | Copied | No count change |
| Save pending | Saving... | Prevent duplicate submission |
| Save failed | Couldn't save your reply. Your text is still here. | Retry save |
| Save success | Saved. [Platform] [n]/[target] today. | Undo recorded status / Next reply |
| Signed out with unsaved draft | Sign in to save your reply. | Preserve local draft until sign-in or explicit discard |

All success/error copy is tied to actual state. Never display Draft saved merely because text remains in browser memory.

## D13. Keyboard and accessibility

Use native textarea, button, label, details/summary and dialog semantics where practical. Platform selector is a labelled radio group with arrow-key navigation. Every mouse action has a keyboard path. Use visible focus, aria-live polite for completed operations and no keyboard trap. Do not move focus when background results arrive.

Cmd/Ctrl+Enter works only in this workspace and not during IME composition. Do not bind Cmd/Ctrl+Shift+C: it conflicts with browser tooling in common environments. Standard text selection/copy remains available. Escape closes a dialog/preview and restores focus, but never discards a draft.

Product targets: 44 px primary controls, at least 32 px utility controls with spacing; 4.5:1 normal text contrast; 3:1 UI/focus contrast where applicable. These are explicit product choices alongside WCAG 2.2 AA requirements, not a claim that every control must be 44 px for AA. Test zoom, long URLs, long Chinese text and focus not obscured by the dock. Honour reduced motion. Do not use colour alone for selected, error or saved states.

## D14. Utility pages and navigation safety

Library supports natural-language search, platform/date/provenance filters and full text. Use in reply restores the workspace with a seed, not an overwrite. Resources and Facts use simple lists and labelled edit forms. Disabled resources/facts stop appearing in new generation immediately but historical records remain intact.

Navigation must preserve the active session. Debounce server draft saves with optimistic version checking; tab-scoped browser recovery is a temporary fallback, not the source of truth. Clear local private drafts on logout and explicit discard. Do not place reply text or search terms in URLs, analytics, browser history or public error logs.

## Design review checklist

At 600 px, can the user see that resources exist without opening another tab? Can they tell old writing from new suggestions? Can they select text without moving cards? Can they edit during a slow model response without losing work? Does English meaning visibly become stale after a Chinese edit? Does Copy do exactly one thing? Can a failed save be retried without a second count? These checks are part of SR-003 #4, SR-014 #15, SR-015 #16, SR-016 #17, SR-017 #18 and SR-019 #20.

Accessibility and clipboard references: [WCAG 2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [WCAG 2.2 new criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText). These support the standards/browser constraints; the proposed layout and state rules are product-design decisions.
