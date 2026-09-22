# Social Replies — Product Plan & Implementation Specification

**Status:** Canonical build spec for First Mate  
**Owner:** James Bugden  
**Prepared:** 2026-09-22  
**Primary user:** James only for v1  
**Temporary app URL:** `https://replies.jamesbugden.com`  
**Canonical implementation repo:** `James-Bugden/Social-Replies-` (public)  
**Build orchestration:** First Mate  
**Execution / browser / device QA:** Orca  

---

## 1. Executive summary

Social Replies is a private engagement assistant for James's daily LinkedIn, X, and Threads replies.

James's real workflow is not “prepare replies in advance.” He is already browsing a social feed and wants to respond before he loses the post. He will normally have two browser windows open side by side:

1. LinkedIn / X / Threads feed in one window.
2. Social Replies in the other.
3. Copy the source post into Social Replies.
4. See what James has said about similar topics before.
5. See useful James resources, tools, guides, or books he could genuinely share.
6. Get three meaningfully different reply ideas in James's voice.
7. Edit the final reply.
8. Copy it back to the feed and post it manually.
9. Mark it posted in Social Replies.
10. Store the exact final posted reply as canonical memory for future retrieval.

Daily target:

- LinkedIn: **10 replies**
- X: **10 replies**
- Threads: **10 replies**
- Total: **30 replies/day**
- Time zone: **Asia/Taipei**

The core product loop is:

```text
External post
  → paste into Social Replies
  → retrieve James's past replies
  → retrieve relevant resources
  → generate reply ideas
  → James edits
  → copy + post manually
  → Mark posted
  → exact final reply enters Reply Library
  → future retrieval gets better
```

This is a separate engagement workflow beside the existing content workflow. Replies must never be pushed directly into Content Schedule.

---

## 2. Locked product decisions

These decisions are already made. First Mate should not stop to re-litigate them unless implementation evidence reveals a genuine blocker.

### 2.1 Product and hosting

- Build as a **separate authenticated single-user application**, not as a hidden Soar route.
- Use the existing **public** GitHub repository `James-Bugden/Social-Replies-`. The application data remains private even though the source code is public.
- Deploy as a separate Vercel project.
- Use `replies.jamesbugden.com` as the temporary domain.
- The app must not hard-code `jamesbugden.com`; the app URL and resource URL are environment/config values because the domain will eventually be deprecated.
- Prefer a **separate Supabase project** for Social Replies so the creator tool is isolated from Soar production. Only fall back to the existing Supabase project if account/project limits make a separate project impractical, and if so use isolated `reply_*` tables plus strict RLS.

### 2.1.1 Public repository security boundary

The GitHub repository is public. Treat every tracked file, commit, branch, pull request, issue, CI log, artifact, and screenshot as potentially visible to anyone.

Never commit:

- API keys, OAuth tokens, access/refresh tokens, cookies, passwords, credentials, service-role keys, certificates, or production `.env` files;
- real historical comment/reply exports or source-post archives;
- production database dumps;
- private account identifiers or login email addresses;
- private Drive exports or copied private documents;
- screenshots, logs, fixtures, network traces, snapshots, or CI artifacts containing real private user content.

All secrets must live in provider secret stores/environment variables. The tracked `.env.example` contains names and blank/example-safe values only.

All historical reply data must be ingested from a local/private source directly into authenticated storage. Import source files live in ignored private directories and never become Git fixtures. Tests use synthetic or anonymized data.

GitHub issues and PRs follow the same rule: reproduce bugs with synthetic text and sanitized screenshots only.

CI must include secret scanning (for example gitleaks or equivalent). If a secret is ever committed, rotate/revoke it first, then remove it from the tree/history and add a regression guard.

### 2.2 User scope

- v1 is for **James only**.
- Do not build onboarding, teams, billing, roles, creator workspaces, or multi-user SaaS capabilities.
- Data model may retain `user_id` so future expansion is possible without a rewrite.

### 2.3 Posting

- v1 does **not** automatically publish comments to LinkedIn, X, or Threads.
- James posts manually in the social platform window.
- `Mark posted` is the event that records the final reply in Social Replies.
- Platform API publishing, OAuth, feed discovery, and browser-extension posting are later phases only.

### 2.4 Historical memory

- Import **all historical replies/comments available to James**, not a curated sample.
- Search the entire corpus on every relevant query.
- The UI only surfaces the best few matches.
- Historical records must preserve provenance so AI drafts are never misrepresented as things James actually posted.

### 2.5 Resources

Resources are a **first-class result section**, not hidden inside generated replies.

The user should explicitly see:

- what he has said before;
- what useful resource he could share;
- what he could reply now;
- what final reply he is about to post.

A generated reply may include a resource, but resource discovery must remain independently visible.

### 2.6 Reply alternatives

Do **not** use generic persistent labels such as:

- Quick
- Add value
- Different angle

Generate three alternatives and dynamically label them according to what is actually different, for example:

- Recruiter perspective
- Shorter
- Taiwan context
- Personal example
- Practical next step
- Gently disagree
- Ask a question
- More direct
- Warmer
- With resource
- No link

### 2.7 Threads language

- Threads output is **Taiwan Traditional Chinese first**.
- Chinese must be written/adapted natively, not as literal translated English.
- Each Threads suggestion has an **English meaning** disclosure for James to check intent.
- The Chinese version is canonical for posting.

### 2.8 Learning source of truth

- Generated text is not canonical.
- The exact text James marks as posted is canonical.
- James's newest confirmed posted replies have the strongest voice weight.
- The app should learn from James's final edits in the same spirit as the existing Typefully learning loop.

---

## 3. Relationship to the existing AI/content workflows

The existing content workflow remains unchanged:

```text
Source
→ Content / Editing
→ Content Library
→ Content Queue Summary
→ Content Schedule
→ Typefully
→ Published
→ final-copy sync
→ learn from James's edits
```

Social Replies is a separate engagement workflow:

```text
External post
→ Social Replies
→ retrieve previous replies/resources
→ draft
→ James edits
→ post manually
→ Mark posted
→ Reply Library
→ learn from James's final reply
```

Optional bridge, later or v1.1:

```text
Good reply / useful conversation
→ Save as Content Idea
→ existing Content Library intake
→ normal Content Workflow
```

Never send a reply directly into Content Schedule.

### Canonical sources Social Replies must respect

Writing / voice:

1. `Master Copywriting Reference.md`
2. `Follow This Writing Style.md`
3. `Threads Reply Style — James Edits.md`
4. Relevant platform-specific content guidance only where useful
5. Retrieved confirmed historical replies
6. Approved Fact Bank
7. Resource Registry

Design / UI copy:

1. `design-rules.md`
2. `Hiresign — Design System v1`
3. `HireSign Product Copy — Principles Report`
4. `Strategic Writing for UX`
5. Current Drive mocks/design directions where relevant
6. Mobbin reference research performed at build time

Coding / verification:

1. `Coding Workflow`
2. `Agent Rules`
3. New repository `AGENTS.md`
4. Any stricter repo-specific runbooks

Core workflow principles to preserve:

- Read before edit.
- Preserve James's edits.
- Verify live state before claiming completion.
- Use First Mate for orchestration.
- Use isolated worktrees.
- T0 for relevant code changes, T1 for browser workflows, T2 for user-visible UX, escalate to T3/T4 only where the surface requires it.
- Never treat a blocked or skipped check as a pass.

---

## 4. Primary user scenario

### 4.1 Typical desktop session

James opens:

- left or main browser window: LinkedIn / X / Threads feed;
- second browser window: Social Replies, approximately 35–45% of screen width.

For each reply:

1. James finds an interesting post.
2. Copies the post text.
3. Pastes it into Social Replies.
4. Selects or confirms the platform.
5. Presses `Get reply ideas` or `Cmd/Ctrl + Enter`.
6. Social Replies surfaces similar historical replies.
7. Social Replies surfaces relevant resources, if any.
8. Social Replies shows three differentiated reply ideas.
9. James picks one or writes his own in `Your reply`.
10. He optionally inserts/removes a resource or refines the reply.
11. Presses `Copy reply`.
12. Pastes back into the social platform and posts.
13. Returns to Social Replies and presses `Mark posted`.
14. Exact editor text is saved to Reply Library.
15. Daily counter increments.
16. Workspace resets for the next post.

### 4.2 Alternate path: James writes the reply himself

Sometimes James will reply directly without generating anything.

Social Replies needs a lightweight utility:

`Add past reply`

Fields:

- Platform
- Your reply
- Original post text, optional
- Post URL, optional

Everything else is inferred automatically.

Do **not** build a separate Inbox workflow in v1.

---

## 5. Product goals

### 5.1 Primary goals

- Make it faster to complete 30 useful replies/day.
- Recover and reuse James's own prior thinking without repeating wording.
- Make relevant guides/tools/books easy to find while replying.
- Improve reply quality by grounding on real James examples and recruiter experience.
- Preserve James's real final replies as a growing private knowledge base.
- Reduce the cognitive overhead of “I know I've said this before, where was it?”

### 5.2 Success measures

Do not create a big analytics dashboard in v1. Store enough events to measure these privately:

- median time from `Get reply ideas` to `Copy reply`;
- median time from session start to `Mark posted`;
- percentage of generated sessions that end in a posted reply;
- percentage of replies using a historical-reply seed;
- percentage using a resource;
- edit distance between suggested text and final posted text;
- manual-from-scratch vs generated-assisted final replies;
- daily completion: LinkedIn / X / Threads against 10/10/10.

The most useful quality metric is **how much James edits before posting**, not a model self-score.

---

## 6. Explicit non-goals for v1

Do not build:

- automatic LinkedIn/X/Threads comment publishing;
- OAuth connections to social platforms;
- social feed discovery;
- “posts worth commenting on” recommendations;
- social listening;
- native iPhone app;
- iOS Share Sheet;
- browser extension;
- Typefully integration;
- content calendar;
- scheduled engagement;
- streak gamification;
- complex dashboards;
- public landing page;
- multi-user SaaS;
- subscriptions/billing;
- team permissions;
- a model picker in the user interface;
- a prompt editor in the user interface.

These may be revisited only after James uses v1 in the real two-window workflow.

---

## 7. Information architecture

Keep navigation minimal.

### `/`

Primary Reply Workspace.

### `/library`

Search and inspect historical replies.

### `/resources`

Manage Resource Registry.

### `/facts`

Manage approved Fact Bank. This may live under Settings if First Mate finds a cleaner IA, but it must remain editable without touching code.

### `/settings`

- daily targets;
- time zone;
- app/base URL configuration display;
- model/provider health information if needed;
- account/logout.

No sidebar is required in v1. Prefer compact top navigation because narrow-width desktop is the primary layout.

---

## 8. Main workspace information hierarchy

After analysis, the page should answer four questions in this order:

1. **What have I said about this before?**
2. **What useful thing can I share?**
3. **What could I reply now?**
4. **What am I actually going to post?**

Use these sections:

1. `You've replied to similar posts before`
2. `Useful things you can share`
3. `Reply ideas`
4. `Your reply`

This hierarchy is intentional and should not be replaced by a generic AI chat layout.

---

## 9. Main workspace detailed UX

### 9.1 Compact sticky header

Left:

`Social Replies`

Right/center counters:

- `LinkedIn 4/10`
- `X 7/10`
- `Threads 3/10`
- optional total `14/30` only if it does not clutter narrow width.

Use tabular numerals.

Utility action:

`Add past reply`

No charts, streaks, or greeting card.

### 9.2 Input area

Label:

**Paste the post you're replying to**

Controls:

- large text area;
- platform segmented control: `LinkedIn | X | Threads`;
- optional `Post link` field, visually secondary;
- primary action: **Get reply ideas**;
- shortcut hint: `⌘↵` / `Ctrl↵`.

Do not use `Generate`, `Analyse`, `Submit`, or `Run AI` as the main button copy.

If a recognisable URL is pasted, auto-detect platform when reliable, but never block manual override.

Remember the most recently used platform in local state.

### 9.3 Results loading strategy

Past replies and resources should appear as soon as retrieval completes. Generation can continue afterwards.

If generation takes more than a moment, show stage text such as:

- `Checking your past replies…`
- `Finding useful resources…`
- `Drafting reply ideas…`

Do not use fake percentages.

Do not clear pasted text while waiting.

### 9.4 Similar past replies

Heading:

**You've replied to similar posts before**

Default: show 3.

Each result:

- platform;
- date or relative age;
- final reply text;
- topic metadata if useful;
- linked resource if one was used;
- provenance if not confirmed posted.

Actions:

- `Use this idea`
- `See more like this`

Optional low-emphasis label:

- `Very similar`
- `Related`

Do not show raw vector similarity percentages.

`View more matches` expands the list or opens Library search.

### 9.5 Resources

Heading:

**Useful things you can share**

This is a dedicated result section.

Show up to 3 resource recommendations, strongest first.

Each card:

- title;
- type: Guide / Tool / Book / Other;
- one short rationale, e.g. `Useful because they're asking how to prepare behavioural examples.`;
- `Add to reply`;
- `Copy link`.

If no resource meets the relevance threshold:

**Nothing worth linking for this one**

This is a successful state, not an error.

When `Add to reply` is pressed:

- use the canonical Resource Registry URL;
- insert a natural CTA sentence into `Your reply`;
- do not dump a naked URL unless that fits the platform/context;
- Threads CTA uses natural Taiwan Traditional Chinese.

### 9.6 Reply ideas

Heading:

**Reply ideas**

Generate exactly 3 alternatives by default.

Each alternative contains:

- dynamic label explaining its angle;
- reply text;
- optional `Includes: [resource]` metadata;
- `Use this` action.

One may have a subtle `Suggested` label.

Do not visually demote the other two.

Labels describe the difference, not an internal model template.

Examples:

- `Recruiter perspective`
- `Shorter`
- `Taiwan context`

If a useful resource exists, one alternative may be `With resource`, but the resource section remains independently visible.

### 9.7 Your reply

Heading:

**Your reply**

This is the highest-priority working surface after generation.

Use an editable textarea/editor.

On wide screens it may be a sticky right rail. On the primary narrow layout it should sit below suggestions and remain easy to return to.

Contextual refinement buttons:

- `Shorter`
- `More direct`
- `Warmer`
- `Add recruiter context`
- `Add personal example`
- `Try another angle`
- `Remove link`

Only display actions that make sense in the current state.

`Add personal example` is disabled or hidden unless the Fact Bank contains a relevant approved fact.

Primary actions:

- **Copy reply**
- **Mark posted**

After Copy:

`Copied`

No modal.

After Mark posted:

`Saved. Threads 6/10 today.`

Then reset the working form after a short, non-blocking confirmation.

### 9.8 Threads English meaning

For Threads reply cards:

- show Chinese first;
- secondary disclosure: `English meaning`;
- clicking expands the English meaning;
- do not permanently double the visible text length.

Do the same in `Your reply` when platform = Threads.

---

## 10. Narrow-window design requirement

Primary design target:

**500–750 px browser width on desktop**.

This is not “mobile responsive fallback.” It is the primary working configuration because James will keep the social feed beside Social Replies.

At this width:

- single column;
- no persistent left sidebar;
- no oversized page title;
- compact header;
- full-width input and editor;
- stacked cards;
- secondary metadata collapsible;
- resource rationales limited to 1–2 lines;
- English meaning collapsed by default;
- sticky action area only if it does not steal too much vertical space.

At >1000 px:

A two-column layout is allowed:

Left:

- source post;
- similar replies;
- resources;
- reply ideas.

Right:

- sticky `Your reply` editor;
- refinement controls;
- Copy / Mark posted.

Do not design wide first and squeeze down afterwards.

---

## 11. Keyboard and high-frequency interaction

Every core action must also work by mouse/touch, but support keyboard-first use.

Required shortcuts:

- `Cmd/Ctrl + Enter` → Get reply ideas
- `Cmd/Ctrl + Shift + C` → Copy current reply
- `Esc` → close disclosure/modal if applicable

All functionality must remain keyboard-operable.

Do not overload v1 with shortcut complexity.

---

## 12. UX copy rules

Apply the existing product-copy principles:

- use words James would naturally say;
- one concept = one term;
- lead with the action/value;
- instruction first, blame never;
- purposeful → concise → conversational → clear;
- one primary action per surface/state;
- no engineer vocabulary in the UI;
- no AI jargon unless diagnosing an actual model/provider problem;
- no generic success prose;
- no “Your request has been successfully completed.”

### Canonical v1 copy table

| Purpose | Copy |
|---|---|
| Input label | Paste the post you're replying to |
| Main action | Get reply ideas |
| History heading | You've replied to similar posts before |
| Resource heading | Useful things you can share |
| No resource | Nothing worth linking for this one |
| Suggestions heading | Reply ideas |
| Final editor | Your reply |
| Use suggestion | Use this |
| Insert resource | Add to reply |
| Copy resource | Copy link |
| Final copy action | Copy reply |
| Record final | Mark posted |
| Threads translation disclosure | English meaning |
| Manual import | Add past reply |
| Post success | Saved. [Platform] [n]/10 today. |
| Generation retry | Try again |

### Error examples

Bad:

`AI generation failed: 500`

Good:

**Couldn't generate reply ideas**  
Your past replies are still available. Try again.

Bad:

`Invalid input`

Good:

**Paste the post first**

---

## 13. Visual design system

Do not invent a new SaaS aesthetic.

Reuse the existing approved design language, adapted for a high-frequency private utility.

### 13.1 Core tokens

Use existing semantic system as the starting point:

- paper: `#FDFBF7`
- paper-alt: `#F4F1E9`
- surface/card: `#FFFFFF`
- ink: `#0E0E0E`
- secondary text: `#5C5C5C`
- line: `#E7E3D8`
- stronger line: `#D6D1C2`
- executive green / green-deep: `#0A3F2C`
- green: `#0E5A3F`
- green-soft: `#E5EFEA`
- gold: `#B08A3E`
- gold-soft / cream: `#F4EBD2`
- warn: `#B83A2A`

Before implementation, First Mate must verify the latest canonical tokens in Drive/current code and update this list if the source of truth has changed.

### 13.2 Typography

- Geist for English and general product UI.
- Noto Sans TC for Traditional Chinese UI/body.
- Existing tabular-numeral treatment for reply counters.
- Inter Tight only if the current brand system still reserves it for a wordmark; Social Replies does not need a prominent branded wordmark.

### 13.3 Utility adaptation

Social Replies is not a marketing page.

Prefer:

- paper-led background;
- white/surface cards;
- hairline borders;
- green for state/primary action;
- neutral styling for metadata;
- restrained gold accent;
- little or no shadow;
- no gradients;
- no giant hero;
- no decorative illustrations;
- no repeated dark-green slabs;
- one consistent hover vocabulary.

### 13.4 Interaction styling

Follow the existing rule:

- interactive cards can use hairline → gold border plus subtle lift;
- static cards do not lift;
- green denotes state/selection;
- neutral denotes metadata.

### 13.5 Density

The app is text-heavy and used 30 times/day.

Use compact-but-readable density:

- 12–14 px metadata;
- 14–16 px reply text, depending on measured readability;
- line-height around 1.5–1.6 for reply text;
- avoid card padding that forces excessive scrolling;
- visible hierarchy through type weight, spacing, and borders rather than many background colours.

---

## 14. Mobbin design research requirement

Mobbin MCP is connected and must be used during the design phase.

Do not copy a single product. Use several shipped products to identify repeated interaction patterns, then apply James's own design system.

### Initial Mobbin reference screens already surfaced

These are starting points, not templates:

- [WRITER — AI writing/alternative-output reference](https://mobbin.com/screens/65eaa501-c59e-47e8-8feb-82715829ec9e)
- [Buffer — compact productivity/composer reference](https://mobbin.com/screens/ff1e037e-1a9f-4bd3-8264-45189fe6ec0e)
- [Superhuman Mail — search/history result reference](https://mobbin.com/screens/af48b9fd-1b50-4527-9eb6-4721900a3662)
- [Threads — native reply-composer reference](https://mobbin.com/screens/768fd2f9-6b34-44e9-a85a-91ff4262784e)
- [X — native reply-composer reference](https://mobbin.com/screens/25d1c280-8940-40e2-8556-329baa681d86)

First Mate must re-open and inspect these actual screens through Mobbin MCP. Do not infer design decisions from app names or metadata alone.

### Required additional Mobbin searches

Search separately for:

1. AI writing assistant with multiple alternatives and inline refinement.
2. Narrow desktop side-panel productivity tool with persistent composer/editor.
3. Search/history interface with text snippets, metadata, filters, expandable results.
4. Recommendation cards with rationale plus `use/insert` action.
5. Social reply composer preserving source-post context.

### Design-research deliverable

Create:

`docs/design/mobbin-research.md`

It must contain:

- 6–12 useful Mobbin screen links;
- what interaction pattern is useful from each;
- what should **not** be copied;
- how each pattern maps to Social Replies;
- screenshots only if permitted and downloaded from the Mobbin high-resolution `image_url`, not ephemeral preview images.

Then create 2–3 coded/mock directions at the 600 px target width before full implementation.

Choose the direction that best supports the two-window workflow.

Do not require a separate Figma project unless it genuinely improves the build. A working browser prototype reviewed in Orca is acceptable and likely faster for this private tool.

---

## 15. External UX guidance to apply

The design process should also reflect current external research:

- Give users several AI alternatives rather than treating the first output as final.
- Make common refinements explicit controls so the user does not have to articulate another prompt every time.
- Keep interfaces sparse enough that secondary AI features do not obstruct the main task.
- Use the actual design system tokens/components/usage rules as agent context instead of relying on generic visual prompting.
- Review AI-generated designs against a deliberate audit loop rather than assuming fast generation means good UX.
- All core functionality must be keyboard accessible.

Relevant references:

- Nielsen Norman Group, *AI for UX: Getting Started*: multiple options and iterative refinement.
- Nielsen Norman Group, *Response Outlining with Generative-AI Chatbots*: contextual GUI controls can reduce articulation/typing burden.
- Nielsen Norman Group, *AI Prototyping in Real Design Contexts*: AI-generated interfaces still require human judgment and detailed constraints.
- W3C WCAG 2.2: keyboard accessibility and no keyboard traps.
- Figma, *LLM Context Design*: tokens + explicit usage rules + audit loop improve agent-generated design consistency.

---

## 16. Reply Library

The Reply Library is the core long-term asset.

### 16.1 Ingestion principle

Store/search **all available James replies**, not only “good examples.”

The system can contain thousands of records while showing only the strongest matches.

### 16.2 Provenance levels

Every record must have a provenance type.

#### `posted_confirmed`

Known to have actually been posted by James.

Highest authority.

May be shown as:

`You've replied to something similar before.`

#### `james_edited_unconfirmed`

Written or materially edited by James, but posting status cannot be proven.

Strong voice evidence.

Do not state that James posted it.

#### `published_main_post`

Published X/LinkedIn/Threads post, not a reply.

Useful for voice/opinion context but lower retrieval priority for “what did I reply before?”

#### `ai_draft`

Historical AI-generated draft without confirmed James approval.

Lowest authority.

May help recover an idea but must never be presented as something James previously said/posted.

### 16.3 Historical source priority

Preferred one-time backfill sources:

1. LinkedIn personal data export — LinkedIn currently documents a `Comments` data category containing comments a member made, including date and URL.
2. X account archive — X documents that the archive contains the user's entire post history. Import all available post records, then identify reply records from available archive metadata and/or subsequent enrichment.
3. Threads/Meta account data export if the actual export available to James contains useful Threads reply history. Do not assume the export schema; inspect the real archive first.
4. Existing Drive sources such as `Threads Reply Style — James Edits.md`, `Threads Auto Replies`, `Threads Replies Drafts`, `Threads and Replies`, and other historical reply files.
5. Future Social Replies `Mark posted` records.

Do not use unauthorised scraping to fill gaps.

### 16.4 Historical source-post text

Older exports may include only James's reply plus a URL/date, not the full third-party source post.

That is acceptable.

Store `source_text = null` when unknown.

The reply text itself is still useful for semantic retrieval.

Do not fabricate source-post content.

### 16.5 Deduplication

Use a deterministic normalized hash plus fuzzy fallback.

Normalize:

- Unicode NFC;
- whitespace;
- URL tracking parameters where safe;
- line endings;
- platform-specific copied prefixes only if clearly non-content.

Primary duplicate key candidate:

`sha256(platform + normalized_final_text + date_bucket)`

Also fuzzy-match near-identical imports from multiple Drive/export sources.

Never silently discard differing versions when provenance differs; keep the strongest record and attach source references where practical.

---

## 17. Resource Registry

Resource discovery is a core v1 feature.

### 17.1 Resource priority

1. James's relevant tool or guide.
2. Relevant James article/page.
3. Useful book/reference.
4. Advice only, no link.

A resource is not required for every reply.

### 17.2 Required fields

- `id`
- `user_id`
- `type` (`guide`, `tool`, `article`, `book`, `other`)
- `title_en`
- `title_zh_tw` nullable
- `canonical_path` nullable
- `zh_tw_path` nullable
- `external_url` nullable, mainly books/other references
- `description`
- `topic_tags`
- `aliases`
- `active`
- `priority_weight`
- `created_at`
- `updated_at`

### 17.3 URL policy

Do not store `https://jamesbugden.com/...` in every resource row if the resource is part of James's site.

Store:

- base domain in configuration;
- path in the resource.

Example:

`RESOURCE_BASE_URL=https://jamesbugden.com`

Resource:

`/interview-prep-guide`

Later changing the base domain should not require rewriting the database.

### 17.4 Hallucination guard

The model never invents URLs.

Only URLs returned from the Resource Registry may be inserted.

If a relevant resource is not in the registry, the model may recommend `advice only` but cannot guess the link.

---

## 18. Fact Bank

The Fact Bank is required in v1 because James's strongest replies often use real recruiter anecdotes, numbers, or employer context.

The model must never invent personal history.

### Required fields

- `id`
- `user_id`
- `fact_text`
- `tags`
- `source_reference` nullable
- `approved` boolean
- `sensitivity` (`public_safe`, `private_context_only`)
- `created_at`
- `updated_at`

Only `approved=true` and `public_safe` facts may be inserted into generated public replies.

Example fact:

`Recruited marketing roles that received hundreds of applications.`

Tags:

`marketing, applications, recruiting, competition`

The app UI can begin with a simple CRUD list. No complex knowledge-management interface is needed.

---

## 19. Data model

Use PostgreSQL/Supabase with pgvector.

Recommended tables:

### `profiles`

Minimal internal profile/user record.

### `source_posts`

Fields:

- `id uuid pk`
- `user_id uuid not null`
- `platform text not null`
- `post_url text null`
- `author_name text null`
- `source_text text null`
- `source_text_normalized text null`
- `detected_language text null`
- `topic_tags text[] default '{}'`
- `embedding vector(...) null`
- `created_at timestamptz`

### `reply_sessions`

One Social Replies generation session.

- `id`
- `user_id`
- `source_post_id`
- `platform`
- `model_provider`
- `model_name`
- `prompt_version`
- `started_at`
- `generated_at`
- `copied_at` nullable
- `posted_at` nullable

### `reply_suggestions`

- `id`
- `session_id`
- `position smallint`
- `angle_label`
- `text`
- `english_meaning` nullable
- `resource_id` nullable
- `based_on_reply_ids uuid[]`
- `created_at`

### `posted_replies`

Canonical Reply Library table.

- `id`
- `user_id`
- `source_post_id` nullable
- `platform`
- `final_text`
- `english_meaning` nullable
- `post_url` nullable
- `reply_url` nullable
- `posted_at` nullable
- `recorded_at`
- `resource_id` nullable
- `topic_tags text[]`
- `provenance text`
- `source_reference jsonb`
- `generated_from_suggestion_id` nullable
- `embedding vector(...)`
- `normalized_hash text`
- `import_batch_id` nullable

### `resources`

As defined above.

### `facts`

As defined above.

### `import_batches`

- `id`
- `user_id`
- `source_type`
- `source_filename`
- `started_at`
- `completed_at`
- `records_seen`
- `records_imported`
- `duplicates_skipped`
- `warnings jsonb`

### `reply_events`

Optional lightweight private telemetry:

- session created
- results shown
- suggestion selected
- resource inserted
- copied
- marked posted

Do not send private reply content to third-party analytics.

---

## 20. Row-level security and privacy

All user-owned tables must enforce:

`user_id = auth.uid()`

No public-read policies.

Server-side service-role use must be minimal and never exposed to the client.

### Auth

For v1:

- Supabase Auth;
- allow only James's account/user ID;
- no public signup;
- optionally implement explicit `ALLOWED_USER_ID` or `ALLOWED_EMAIL` check server-side after login.

### Secret handling

Because the repository is public, real values must never appear in tracked files, issues, PRs, screenshots, fixtures, or CI logs. Public examples use blank/placeholders only.

Server only:

- model API keys;
- embedding API key;
- Supabase service-role key if required.

Client-safe:

- Supabase URL;
- anonymous/public key.

Do not log:

- access tokens;
- model API keys;
- full private imported archives;
- full source-post/reply contents in infrastructure logs unless explicitly necessary and redacted.

---

## 21. Retrieval architecture

Use hybrid retrieval rather than pure vector search.

### 21.1 Query input

Input signals:

- source post text;
- platform;
- language;
- optional user hint later if added;
- topic classification.

### 21.2 Candidate retrieval

Retrieve candidates using:

1. vector similarity on reply embeddings;
2. lexical/keyword similarity;
3. topic tag overlap;
4. platform metadata;
5. provenance;
6. recency.

Because the corpus is bilingual and Traditional Chinese is important, do not rely only on PostgreSQL English full-text search.

Recommended approach:

- embeddings as the primary semantic layer;
- `pg_trgm`/normalized substring matching for lexical similarity;
- English `tsvector` only as an additional signal where useful;
- application-level token overlap for Chinese if it improves results without heavy infrastructure.

### 21.3 Ranking

Initial ranking formula should be explicit and testable, for example:

- semantic similarity: 50–65%
- lexical/topic overlap: 10–20%
- provenance weight: 10–15%
- recency: 5–10%
- platform fit: 5–10%

Do not hard-code these percentages as permanent truth. Evaluate against historical examples and tune.

### 21.4 Provenance weighting

Suggested ordering:

`posted_confirmed` > `james_edited_unconfirmed` > `published_main_post` > `ai_draft`

### 21.5 Result count

Backend can fetch 20–40 candidates.

UI shows 3 by default.

Generation context should usually include 3–7 strong historical replies, not the whole corpus.

---

## 22. AI architecture

### 22.1 Provider abstraction

Do not couple the product to one model provider.

Create a small internal interface such as:

```ts
interface ReplyGenerator {
  generateReplySet(input: ReplyGenerationInput): Promise<ReplyGenerationOutput>
}
```

Providers live server-side, for example:

`src/lib/ai/providers/anthropic.ts`

`src/lib/ai/providers/openai.ts`

`src/lib/ai/providers/google.ts`

Only one production provider is active through environment configuration.

Do not expose a model picker in v1.

### 22.2 Model selection

Run a James-specific benchmark before locking the production model.

Golden set:

- 50–100 historical source/reply pairs where possible;
- include English LinkedIn/X;
- include Taiwan Traditional Chinese Threads;
- include short replies, nuanced disagreement, resource sharing, recruiter anecdotes, Taiwan context.

Evaluate:

- voice match;
- usefulness;
- specificity;
- Taiwan-Chinese naturalness;
- hallucinated James facts;
- overuse of AI structures;
- unnecessary links;
- edit distance to James's actual reply;
- whether James would plausibly post it.

Primary selection criterion:

**lowest correction burden at acceptable cost/latency**.

### 22.3 Prompt architecture

Do not paste every Drive document into every request.

Use four layers:

1. compact fixed Social Replies rules;
2. platform adapter;
3. retrieved James memory/resources/facts;
4. current source post.

Use prompt caching where the selected provider supports it and where it materially reduces cost/latency.

### 22.4 James voice guardrails

Always apply:

- clear/simple language;
- short conversational sentences;
- no em dashes;
- no semicolons;
- no generic AI wrappers;
- no fake story/metric/opinion;
- British English for English output where relevant;
- Taiwan Traditional Chinese terminology for Threads;
- use real retrieved examples/facts rather than inventing texture;
- avoid making every reply a neat framework or slogan;
- allow short replies to stay short;
- do not force disagreement.

---

## 23. Structured generation output

Require structured JSON from the model and validate it server-side.

Conceptual schema:

```json
{
  "topic": "resume targeting",
  "reply_ideas": [
    {
      "angle_label": "Recruiter perspective",
      "text": "...",
      "english_meaning": null,
      "resource_id": null,
      "uses_fact_ids": [],
      "based_on_reply_ids": ["..."]
    },
    {
      "angle_label": "Shorter",
      "text": "...",
      "english_meaning": null,
      "resource_id": null,
      "uses_fact_ids": [],
      "based_on_reply_ids": ["..."]
    },
    {
      "angle_label": "With resource",
      "text": "...",
      "english_meaning": null,
      "resource_id": "...",
      "uses_fact_ids": [],
      "based_on_reply_ids": ["..."]
    }
  ],
  "suggested_index": 0,
  "refinement_actions": ["Shorter", "More direct", "Try another angle"]
}
```

Server validation rules:

- exactly 3 alternatives unless a controlled error/retry occurs;
- labels must differ meaningfully;
- any `resource_id` must exist in retrieved Resource Registry candidates;
- any `uses_fact_ids` must reference approved/public-safe facts included in context;
- Threads requires `english_meaning`;
- no unknown URLs may appear in output unless they were supplied in the resource context.

---

## 24. Repetition protection

The tool should help James reuse ideas without visibly repeating himself.

Before showing generated suggestions, compare against recent posted replies for:

- semantic similarity;
- exact phrase overlap;
- same opening phrase;
- same CTA;
- same anecdote;
- same resource;
- same rhetorical structure when feasible.

If wording is too close:

- regenerate that alternative once with a constraint to preserve the idea but change expression;
- show a subtle warning only if still very similar.

Human-readable warning:

`Very similar wording used 12 days ago.`

Do not expose embedding numbers.

---

## 25. Platform adapters

### 25.1 LinkedIn

Default characteristics:

- English;
- conversational/professional;
- enough context to add value;
- recruiter credibility where relevant;
- avoid corporate-polished filler;
- no artificial “thought leadership” structure.

### 25.2 X

Default characteristics:

- English;
- direct;
- can be very short;
- sharper observation is acceptable;
- do not enforce 280 characters because James has Premium;
- still prefer brevity when the idea does not need length.

### 25.3 Threads

Default characteristics:

- Taiwan Traditional Chinese;
- natural Taiwan wording;
- shorter, conversational, senior-colleague feel;
- avoid formal connectors and Mainland terminology;
- use the observed `Threads Reply Style — James Edits.md` patterns;
- provide English meaning for James.

Threads text should be authored/adapted as Chinese, not translated mechanically from an English master draft.

---

## 26. API / server routes

Exact paths may vary with framework, but v1 needs these capabilities.

### `POST /api/reply/analyse`

Input:

- platform;
- source text;
- optional URL.

Returns progressively or together:

- normalized source-post record;
- past-reply matches;
- resource matches;
- generation session ID;
- three reply ideas.

### `POST /api/reply/refine`

Input:

- session ID;
- current final text;
- action (`shorter`, `more_direct`, etc.).

Returns refined text.

### `POST /api/reply/mark-posted`

Input:

- session ID;
- exact final text;
- optional reply URL;
- resource used;
- optional posted timestamp.

Creates canonical `posted_replies` record and embedding.

### `POST /api/replies/manual`

Add a past/manual reply.

### `GET /api/library/search`

Search historical replies.

### Resource CRUD

Authenticated single-user endpoints.

### Fact CRUD

Authenticated single-user endpoints.

All routes validate authentication and user ownership.

---

## 27. Historical import implementation

### 27.1 Import architecture

Build adapters rather than one-off scripts.

Example:

```text
imports/
  linkedin/
  x/
  threads/
  drive/
```

Each adapter converts source data into a common normalized structure.

### 27.2 Common import record

```ts
type ImportedReply = {
  platform: 'linkedin' | 'x' | 'threads';
  finalText: string;
  date?: string;
  sourceUrl?: string;
  replyUrl?: string;
  sourceText?: string;
  provenance: 'posted_confirmed' | 'james_edited_unconfirmed' | 'published_main_post' | 'ai_draft';
  sourceReference: Record<string, unknown>;
}
```

### 27.3 LinkedIn

Preferred source: LinkedIn Download Your Data → Comments category.

Official LinkedIn help currently states that Comments contains comments made to posts/articles/shares/collaborative articles and includes date and URL.

Importer requirements:

- inspect actual delivered CSV schema before coding assumptions;
- preserve original URL/date;
- detect encoding correctly;
- import as `posted_confirmed` when the archive clearly represents James's activity;
- source-post text may remain unknown.

### 27.4 X

Preferred source: X data archive.

X currently documents that archive downloads include the user's post history.

Importer requirements:

- inspect actual archive JSON/JS format;
- identify replies from available relationship metadata when present;
- if reliable reply detection is unavailable for older entries, import broader post records into a staging review rather than inventing certainty;
- preserve post IDs/URLs if derivable from archive data;
- do not scrape X to reconstruct missing context in v1.

### 27.5 Threads

First Mate must inspect the actual Meta/Threads account export available to James.

Do not assume schema or completeness.

If reply history is present, build an adapter.

If not, seed from Drive historical reply sources and rely on Social Replies for complete future capture.

### 27.6 Drive

Import identified reply/history files.

Classifier must distinguish:

- explicit posted/final records;
- James-edited draft records;
- AI-generated unconfirmed records.

When ambiguous, choose the lower-authority provenance instead of claiming `posted_confirmed`.

### 27.7 Import UI

For v1, this can be admin-only and minimal:

- upload archive/file;
- show parsed record count;
- show duplicate count;
- show warnings;
- confirm import.

No polished import wizard is needed.

---

## 28. Library page

Purpose: let James intentionally find something he remembers saying.

### Controls

- natural-language search;
- platform filter;
- topic filter;
- date range optional;
- resource filter optional;
- provenance filter hidden under `More filters` unless needed often.

### Result card

- platform;
- date;
- reply text;
- resource if used;
- source URL/reply URL where available;
- provenance label only if not confirmed posted.

Actions:

- `Copy`
- `Use in Social Replies`

Search should be fast enough to feel instant on a corpus of at least tens of thousands of replies.

---

## 29. Resource page

Simple CRUD.

List columns/cards:

- title;
- type;
- path/URL;
- tags;
- active state.

Actions:

- Add resource
- Edit
- Disable

Avoid destructive permanent delete in normal UI; disable is safer.

---

## 30. Fact Bank page

Simple editable list.

Show:

- fact;
- tags;
- public-safe/private-only;
- approved state.

Generated public replies only use approved + public-safe facts.

---

## 31. App state and resilience

### 31.1 Preserve working state

If generation fails, keep:

- pasted source text;
- selected platform;
- retrieved history/resources if available;
- final editor text.

### 31.2 Local recovery

Persist current unsent work to local storage/session storage so a refresh does not destroy the current reply draft.

Clear after successful `Mark posted`.

### 31.3 Idempotency

`Mark posted` must be safe against double-click/retry.

Use an idempotency key based on session + final hash or a server-generated operation ID.

---

## 32. Accessibility

Minimum requirements:

- full keyboard operation;
- visible focus states;
- no keyboard traps;
- correct labels for inputs/buttons;
- segmented controls have accessible selected state;
- colour is not the only state signal;
- reasonable contrast;
- clickable targets sized appropriately;
- `Copied` success is announced without moving focus;
- loading states use accessible live regions where appropriate;
- Traditional Chinese line-height remains readable.

---

## 33. Recommended technical stack

First Mate should inspect current ecosystem versions at implementation time, but the default architecture is:

- Next.js + TypeScript;
- Vercel;
- Tailwind CSS;
- shadcn/ui where it helps, without allowing default shadcn aesthetics to override James's design system;
- Supabase Postgres;
- Supabase Auth;
- pgvector;
- `pg_trgm` for lexical/fuzzy matching;
- Zod or equivalent for API/model schema validation;
- Playwright;
- Vitest/Jest depending on repo defaults;
- provider SDKs server-side only.

Why Next.js rather than a client-only Vite app:

- simple server-side model routes;
- API keys stay server-side;
- Vercel deployment is straightforward;
- auth/session handling fits a private web utility.

If First Mate finds a materially simpler architecture after inspecting current tools, it may adjust framework choice, but must preserve the security and product contracts in this spec.

---

## 34. Environment configuration

Example names:

```text
NEXT_PUBLIC_APP_URL=https://replies.jamesbugden.com
RESOURCE_BASE_URL=https://jamesbugden.com
APP_TIMEZONE=Asia/Taipei
ALLOWED_USER_EMAIL=

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

AI_PROVIDER=...
AI_MODEL=...
AI_API_KEY=...

EMBEDDING_PROVIDER=...
EMBEDDING_MODEL=...
EMBEDDING_API_KEY=...
```

Never commit values.

Keep resource base URL independent from app URL.

---

## 35. Deployment and domain

### Repo

Create:

`James-Bugden/Social-Replies-`

Private.

Default branch:

`main`

### Vercel

Create separate project:

`social-replies`

Initial Vercel URL is fine during development.

After production smoke tests, attach:

`replies.jamesbugden.com`

Do not remove or alter the root `jamesbugden.com` site as part of this project.

### Future domain move

Because the domain is expected to be deprecated later:

- app base URL comes from env;
- resource base URL comes from env/config;
- canonical resource paths stay separate;
- no business logic depends on `jamesbugden.com` strings.

---

## 36. Testing strategy

Follow the canonical Coding Workflow.

### T0 — required

- typecheck;
- lint;
- unit tests;
- schema validation;
- RLS tests;
- importer parsing tests;
- retrieval ranking tests;
- resource URL guards;
- Fact Bank approval guards;
- idempotent Mark posted tests;
- daily counter calculation in Asia/Taipei;
- Threads English-meaning required-field validation.

### T1 — Playwright

Core journey:

1. login;
2. paste a post;
3. choose platform;
4. Get reply ideas;
5. see history;
6. see resource results;
7. see three reply ideas;
8. select suggestion;
9. refine;
10. copy;
11. mark posted;
12. counter increments;
13. saved reply appears in Library.

Also test:

- no relevant resource;
- generation failure while retrieval succeeds;
- duplicate Mark posted;
- manual Add past reply;
- Threads Chinese + English meaning;
- long source post;
- long reply;
- session refresh/recovery.

### T2 — Orca browser/UX

Required because this is a user-visible high-frequency UI.

Review at minimum:

- 600 px desktop window;
- 720 px desktop window;
- 1440 px wide desktop;
- visual hierarchy;
- amount of scrolling;
- sticky editor behaviour;
- keyboard workflow;
- focus state;
- loading state;
- error state;
- Chinese density/line breaks;
- copy clarity;
- console/network errors;
- design-system adherence.

### T3

Use iOS Simulator / Android AVD only for responsive/mobile-sensitive behaviours that First Mate intentionally supports in v1.

### T4

Not a default v1 requirement.

Escalate if the build includes or reveals behaviour covered by canonical T4 triggers, especially real clipboard/browser issues, mobile viewport/keyboard issues, or simulator/production disagreement.

---

## 37. AI quality evaluation gate

Software tests are not enough.

Create:

`tests/evals/reply-golden-set.*`

Evaluation dataset should include at least 50 historical examples when available.

Before changing:

- production model;
- core prompt;
- retrieval weights;
- Threads platform adapter;
- Fact Bank injection rules;

run the eval set.

Track:

- hallucinated facts: must be zero;
- unknown URLs: must be zero;
- language/terminology violations;
- excessive similarity to old wording;
- structural repetition;
- edit-distance proxy;
- blinded human preference where practical.

A change with better latency/cost but materially worse James-voice quality does not ship.

---

## 38. Observability

Keep v1 lightweight.

Track server-side:

- route latency;
- provider latency;
- generation failures;
- embedding failures;
- import warnings;
- database errors.

Private product metrics can be stored in `reply_events`.

Do not put full social-post/reply text into Sentry/analytics by default.

Redact or omit request bodies from error logging.

---

## 39. Build plan for First Mate

The implementation backlog is deliberately compact. Social Replies is a small single-user tool, so avoid enterprise ceremony and split work only where parallelism or independent verification adds value. GitHub issues use the `SR-` prefix.

### M0 — Foundation and design

**SR-001 — Repository, security and CI foundation**
- verify the existing public repo;
- scaffold Next.js/TypeScript/Tailwind/shadcn;
- enforce `.gitignore`, `.env.example`, `SECURITY.md`, secret scanning and basic CI;
- register project with First Mate.

**SR-002 — Mobbin + Drive design research**
- read canonical Drive design/copy sources;
- visually inspect relevant Mobbin screens/flows;
- write `docs/design/research.md` with what to adopt/avoid.

**SR-003 — Lock the narrow two-window UX**
- create 2–3 realistic directions around 600 px width;
- include source input, past replies, resources, reply ideas and final editor;
- review in Orca and select one.

**SR-004 — Supabase, auth and core schema**
- separate Supabase project preferred;
- Supabase Auth with owner allowlist;
- pgvector + required indexes;
- RLS;
- no secret/client leakage.

### M1 — Memory, resources and retrieval

**SR-005 — Resource Registry**
- schema, seed/import path and simple management UI;
- paths stored separately from `RESOURCE_BASE_URL`;
- no hallucinated URLs.

**SR-006 — Approved Fact Bank**
- schema and simple management UI;
- generation can use only approved facts for personal examples.

**SR-007 — Historical reply import framework**
- common importer contract;
- provenance, normalization, dedupe, idempotent batches;
- private source files remain outside Git.

**SR-008 — Platform/Drive import adapters**
- inspect real LinkedIn/X/Meta exports when supplied;
- import all available comments/replies;
- import relevant Drive reply sources without committing the corpus.

**SR-009 — Embeddings + hybrid retrieval**
- embeddings, lexical/trigram search, provenance and recency weighting;
- surface top 3 initially with `View more matches`.

**SR-010 — Resource retrieval and no-link threshold**
- show up to 3 genuine matches;
- support explicit `Nothing worth linking for this one`.

### M2 — Generation and main workflow

**SR-011 — AI provider abstraction + structured output**
- provider/model configurable;
- schema validation, timeout/retry policy;
- one call produces three alternatives.

**SR-012 — Platform prompts + zh-TW adapter**
- LinkedIn English;
- X English;
- Threads native Taiwan Traditional Chinese plus expandable English meaning;
- reuse canonical voice sources rather than duplicating them.

**SR-013 — Repetition and hallucination guards**
- compare wording/CTA/example reuse;
- resources must resolve to Registry;
- personal examples must resolve to Fact Bank.

**SR-014 — Compact Social Replies workspace**
- daily 10/10/10 counters;
- paste/input + platform control;
- 500–750 px-first layout;
- no persistent sidebar.

**SR-015 — Past Replies + Useful Resources sections**
- historical matches shown before generation results where possible;
- `Use this idea`, `View more matches`, `Add to reply`, `Copy link`.

**SR-016 — Reply Ideas + final editor**
- exactly three dynamically labelled alternatives by default;
- contextual refinements;
- Threads English-meaning disclosure;
- keyboard shortcuts.

**SR-017 — Copy, Mark posted, counters and Add past reply**
- exact final editor text becomes canonical memory;
- idempotent save;
- Asia/Taipei daily counters;
- lightweight manual save for replies written outside the tool.

**SR-018 — Library/admin utility pages**
- searchable Reply Library;
- minimal Resource/Fact editing;
- no dashboard bloat.

### M3 — Quality and production

**SR-019 — AI evaluation + browser/UX QA**
- private golden set kept outside Git;
- synthetic public fixtures only;
- T0 + Playwright core flows;
- Orca narrow-window review;
- dedicated zh-TW pass.

**SR-020 — Vercel/domain/production smoke**
- deploy separate Vercel project;
- attach `replies.jamesbugden.com`;
- production login, model call, save, retrieval and counter smoke;
- verify no private data or secrets appear in public repo/CI artifacts.

The root `SOCIAL-REPLIES-GITHUB-ISSUES.md` is the issue bootstrap authority and carries dependencies/acceptance criteria for these work items.

---

## 40. Parallelisation guidance

First Mate can parallelise:

- design research and database schema after SR-000;
- Resource Registry and Fact Bank;
- import adapters after common importer contract exists;
- UI component implementation after design direction is locked;
- Playwright authoring alongside stable UI flows.

Do not parallelise multiple agents against the same mutable checkout.

Do not start visual implementation before the narrow-workspace design direction is chosen.

Do not block the whole build on perfect historical import. A small confirmed corpus can validate retrieval while import adapters continue in parallel.

---

## 41. Estimated effort

For First Mate + coding agents, not a traditional solo-developer estimate:

### Thin usable slice

Approximately **5–8 agent engineering hours** of implementation scope:

- auth;
- core DB;
- basic retrieval with a small seed corpus;
- generation;
- main UI;
- Copy / Mark posted.

### Solid single-user v1

Approximately **12–25 agent engineering hours** of implementation scope, depending mostly on:

- historical archive cleanliness;
- model/provider setup;
- import edge cases;
- UX iterations after real use.

This includes:

- full main workflow;
- all-comment import framework;
- hybrid retrieval;
- Resource Registry;
- Fact Bank;
- Threads bilingual behaviour;
- Library;
- tests/QA;
- production deploy.

Do not treat these as elapsed-time promises. First Mate should keep work moving in parallel and only stop for genuine owner-only decisions or logins/exports.

Later browser extension estimate: roughly **+8–15 agent engineering hours** once the web workflow proves valuable.

---

## 42. v1 acceptance criteria

The product is ready for James's daily use when all are true:

### Core workflow

- [ ] James can use Social Replies comfortably in a 500–750 px desktop browser window next to a social feed.
- [ ] James can paste a LinkedIn/X/Threads post.
- [ ] Platform can be selected/overridden.
- [ ] `Get reply ideas` returns useful results without clearing input.
- [ ] 3 relevant prior replies are surfaced when available.
- [ ] The system searches the full historical Reply Library.
- [ ] Relevant resources are shown in their own section.
- [ ] No-resource state is explicit and non-promotional.
- [ ] `Add to reply` inserts a natural CTA using a real Registry URL.
- [ ] Exactly 3 meaningfully different reply ideas are generated by default.
- [ ] Labels explain the real angle difference.
- [ ] Threads shows Taiwan Traditional Chinese plus expandable English meaning.
- [ ] James can edit final text freely.
- [ ] James can copy final text with one action/shortcut.
- [ ] `Mark posted` stores the exact final text.
- [ ] Mark posted increments the correct daily platform counter in Asia/Taipei.
- [ ] Saved reply becomes retrievable for the next relevant post.

### Memory integrity

- [ ] `posted_confirmed` is never conflated with AI drafts.
- [ ] Historical imports retain provenance.
- [ ] AI never claims unconfirmed draft text was posted.
- [ ] Duplicate imports are handled safely.

### Hallucination guards

- [ ] No generated public anecdote is allowed without an approved public-safe Fact Bank record.
- [ ] No generated resource URL is allowed unless it comes from Resource Registry.
- [ ] Unknown/made-up URLs fail validation.

### Design/UX

- [ ] Current Drive design tokens/rules are applied.
- [ ] Mobbin research is documented.
- [ ] Primary UI has one clear action per state.
- [ ] No generic corporate/AI microcopy.
- [ ] No unnecessary dashboard clutter.
- [ ] Narrow desktop layout passes Orca visual review.
- [ ] Keyboard workflow works.
- [ ] Focus states and core accessibility pass.

### Quality

- [ ] T0 passes.
- [ ] T1 core flow passes.
- [ ] T2 Orca review passes.
- [ ] AI golden-set gate shows no hallucinated facts/URLs.
- [ ] Threads sample set passes zh-TW terminology/voice review.
- [ ] Production build is smoke-tested after deployment.

---

## 43. First real-use review

After James uses the tool for approximately 50–100 real replies, First Mate should review actual friction before building more features.

Measure/review:

- sections James ignores;
- average number of suggestions he opens;
- whether resources are genuinely useful or too promotional;
- whether past-reply retrieval is more valuable than generation;
- which refinement actions he actually uses;
- average edit distance;
- whether two-window copying is annoying enough to justify the browser extension;
- whether `Mark posted` is forgotten often enough to warrant a capture improvement.

Do **not** assume the browser extension is necessary until this evidence exists.

---

## 44. Later phases

### Browser extension

If real use justifies it:

- capture selected/source post text;
- capture platform + URL;
- open compact Social Replies side panel;
- reuse the exact same backend;
- still keep posting manual initially;
- optional `Save my posted reply` capture.

### Mobile

- PWA optimisation first;
- native Share Sheet only after proven need.

### Discovery

- recommended posts/people worth replying to;
- only after reply creation/retrieval is already useful.

### Productisation

If Social Replies ever becomes a product for other creators:

- separate tenant data;
- per-user voice/fact/resource memory;
- onboarding;
- quotas/billing;
- privacy/export/delete flows;
- platform connection review;
- stronger abuse/security controls.

None of this belongs in v1.

---

## 45. First Mate handover instruction

When First Mate receives this document, it should treat it as the product/implementation authority for Social Replies while still obeying higher-level canonical Coding Workflow, Agent Rules, and repository-specific instructions.

First Mate should:

1. Inspect current GitHub/Vercel/Supabase state rather than assuming it.
2. Use/register the existing public `James-Bugden/Social-Replies-` repo and enforce the public-repository security boundary before feature work.
3. Read the canonical Drive design, copy, writing, and reply-style sources named above.
4. Use Mobbin MCP for the required design research.
5. Use isolated workers/worktrees.
6. Keep the narrow two-window workflow as the primary design constraint.
7. Build the smallest end-to-end slice early.
8. Continue historical import/retrieval work in parallel where safe.
9. Use real historical replies for retrieval/evaluation as soon as possible.
10. Never invent James facts, URLs, or historical-post certainty.
11. Run the required verification ladder.
12. Deploy and verify the promoted production build.
13. Report only genuine owner decisions/blockers to James.

### Owner-only inputs First Mate may eventually need

Do not ask for these until the build reaches the point where they are actually required:

- authentication email/account confirmation;
- downloaded LinkedIn archive;
- downloaded X archive;
- available Threads/Meta archive;
- DNS/domain login if not already accessible;
- API provider billing key if no existing server-side key is available;
- final design pick only if the 2–3 coded directions remain materially different after evidence-based review.

Everything else should be resolved from current state, existing patterns, this spec, and canonical Drive documentation.

---

## 46. Research references

### Internal / Drive

- AI Workflows Index & Operating Guide
- Coding Workflow
- Agent Rules
- Content AI Workflow & Canonical References
- Master Copywriting Reference.md
- Follow This Writing Style.md
- Threads Reply Style — James Edits.md
- design-rules.md
- Hiresign — Design System v1
- HireSign Product Copy — Principles Report
- Strategic Writing for UX

### Mobbin seed references

- WRITER: https://mobbin.com/screens/65eaa501-c59e-47e8-8feb-82715829ec9e
- Buffer: https://mobbin.com/screens/ff1e037e-1a9f-4bd3-8264-45189fe6ec0e
- Superhuman Mail: https://mobbin.com/screens/af48b9fd-1b50-4527-9eb6-4721900a3662
- Threads: https://mobbin.com/screens/768fd2f9-6b34-44e9-a85a-91ff4262784e
- X: https://mobbin.com/screens/25d1c280-8940-40e2-8556-329baa681d86

### External

- Nielsen Norman Group — AI for UX: Getting Started
- Nielsen Norman Group — Response Outlining with Generative-AI Chatbots
- Nielsen Norman Group — AI Prototyping in Real Design Contexts
- W3C — WCAG 2.2
- Figma — LLM Context Design / MCP design-system guidance
- LinkedIn Help — Download your data (Comments category)
- X Help — Download/access your data archive

---

# Appendix A — Suggested component map

```text
AppShell
├── CompactHeader
│   ├── AppTitle
│   ├── DailyPlatformCounters
│   └── AddPastReplyButton
├── ReplyWorkspace
│   ├── SourcePostInput
│   │   ├── PlatformSegmentedControl
│   │   ├── SourceTextArea
│   │   ├── OptionalPostUrl
│   │   └── GetIdeasButton
│   ├── SimilarRepliesSection
│   │   └── SimilarReplyCard[]
│   ├── ResourceSuggestionsSection
│   │   └── ResourceSuggestionCard[]
│   ├── ReplyIdeasSection
│   │   └── ReplyIdeaCard[3]
│   └── FinalReplyEditor
│       ├── TextArea
│       ├── EnglishMeaningDisclosure (Threads)
│       ├── RefinementActions
│       ├── CopyReplyButton
│       └── MarkPostedButton
└── Toast/LiveRegion
```

Wide layout may reposition `FinalReplyEditor` into a sticky right column without changing component behaviour.

---

# Appendix B — Suggested server module map

```text
src/
  app/
    api/
      reply/
        analyse/
        refine/
        mark-posted/
      replies/
        manual/
        search/
      resources/
      facts/
  lib/
    ai/
      providers/
      prompt/
      schemas/
      evals/
    retrieval/
      replies.ts
      resources.ts
      ranking.ts
      repetition.ts
    embeddings/
    imports/
      linkedin/
      x/
      threads/
      drive/
    supabase/
    auth/
    domain/
  components/
    social-replies/
    library/
    resources/
    facts/
  styles/
    tokens.css
```

Exact paths may follow framework conventions; preserve module boundaries even if names change.

---

# Appendix C — Definition of done for a reply session

A reply session is complete only when:

1. Source post is captured or explicitly unavailable.
2. Platform is known.
3. Historical retrieval ran successfully or returned a genuine empty state.
4. Resource retrieval ran successfully or returned `Nothing worth linking for this one`.
5. Generation returned 3 validated alternatives, unless James chose to write manually.
6. Final editor contains the exact text James intends to post.
7. Copy action succeeded or James otherwise posted it.
8. `Mark posted` persisted exact final text exactly once.
9. Embedding/backfill completed or entered a retryable queue.
10. Daily counter updated using Asia/Taipei date boundary.

---

# Appendix D — Product principle in one sentence

**Paste the post, find what I've said before, see what I can share, write the reply, post it, and remember exactly what I said.**