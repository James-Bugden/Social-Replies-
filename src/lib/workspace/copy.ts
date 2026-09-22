/**
 * Every user-facing string in the workspace, in one place (D12).
 *
 * Two reasons this is a module rather than text scattered through components.
 * First, D12 specifies exact copy and it should be possible to diff the app
 * against the specification. Second, and more importantly, the rule that "all
 * success and error copy is tied to actual state" is only checkable if the states
 * and their strings sit side by side: it is obvious here that there is no string
 * for "Draft saved" that a component could reach for while text merely sits in
 * browser memory.
 *
 * The interface is English in v1. Personal replies follow the owner's own voice,
 * which is a different register and lives in the generation prompts, not here.
 */

export const SOURCE = {
  heading: 'What are you replying to?',
  label: "Paste the post or comment you're replying to",
  urlLabel: 'Post link',
  parentLabel: 'Add parent-post context',
  parentHint: 'The post this comment is under, if you are replying to a comment.',
  submit: 'Get reply ideas',
  submitHint: 'Ctrl or Cmd, then Enter',
  empty: 'Paste the post or comment first.',
  keywordMode: 'Search by keyword',
  keywordSubmit: 'Search my replies and resources',
  keywordOnly: 'Paste a post or comment to get tailored reply ideas.',
  targetPost: 'Post',
  targetComment: 'Comment',
  expand: 'Show the full post',
  collapse: 'Show less',
} as const;

export const HISTORY = {
  /** Used only for confirmed posted replies (D04). */
  headingConfirmed: "You've replied to similar posts before",
  /** Drafts and main posts sit here instead, with their provenance stated. */
  headingSaved: 'Saved writing',
  navLabel: 'Your past replies',
  loading: 'Checking your past replies...',
  empty: 'No matching past replies yet.',
  error: "Couldn't search past replies.",
  retry: 'Retry search',
  expand: 'Show full text',
  collapse: 'Show less',
  copy: 'Copy text',
  use: 'Use this idea',
  more: 'Show more matches',
  dateUnknown: 'Date unknown',
} as const;

export const RESOURCES = {
  heading: 'Useful things you can share',
  loading: 'Checking your resources...',
  noMatch: "Nothing worth linking for this one.",
  emptyCatalog: 'Add your first resource to find it here.',
  emptyCatalogAction: 'Open Resources',
  error: "Couldn't check your resources.",
  retry: 'Retry resources',
  add: 'Add to reply',
  addRecommendation: 'Add recommendation',
  copyLink: 'Copy link',
  alreadyAdded: 'Already added',
  showMore: (count: number) => `Show ${count} more resource${count === 1 ? '' : 's'}`,
  englishOnly: 'English resource',
} as const;

export const IDEAS = {
  heading: 'Reply ideas',
  loading: 'Drafting reply ideas...',
  failed: "Couldn't create reply ideas. Your draft is unchanged.",
  rateLimited: 'Reply ideas are temporarily paused. Your draft is unchanged.',
  notConfigured: 'Reply ideas are not set up yet. Everything else still works.',
  withheld: "These suggestions didn't pass the grounding checks, so they aren't shown.",
  retry: 'Try again',
  use: 'Use this',
  suggested: 'Suggested',
  includes: (title: string) => `Includes: ${title}`,
  showMeaning: 'English meaning',
} as const;

export const EDITOR = {
  heading: 'Your reply',
  label: 'Your reply',
  placeholder: 'Write your reply, or use one of the ideas above.',
  jumpTo: 'Jump to your reply',
  shorter: 'Shorter',
  moreDirect: 'More direct',
  warmer: 'Warmer',
  addExample: 'Add a personal example',
  removeResource: 'Remove resource',
  rewriteReady: 'Review this version before replacing your reply.',
  applyRewrite: 'Apply rewrite',
  keepMine: 'Keep my reply',
  replaceReply: 'Replace reply',
  undo: 'Undo',
} as const;

export const MEANING = {
  heading: 'English meaning',
  stale: 'Your reply changed. Refresh the English meaning.',
  refresh: 'Refresh English meaning',
  loading: 'Translating...',
  failed: "Couldn't refresh the English meaning. Your reply is unchanged.",
} as const;

export const RECORD = {
  copy: 'Copy reply',
  copied: 'Copied',
  copyFailed: "Couldn't copy automatically. Select the text and copy it.",
  editedSinceCopy: 'Edited since copy',
  markPosted: 'Mark posted',
  helper: 'Post it in your feed, then mark it posted here.',
  helperEdited: 'If you changed the reply in the feed, paste that final version here first.',
  saving: 'Saving...',
  saveFailed: "Couldn't save your reply. Your text is still here.",
  retrySave: 'Retry save',
  saved: (platform: string, count: number, target: number) =>
    `Saved. ${platform} ${count}/${target} today.`,
  undoRecorded: 'Undo recorded status',
  next: 'Next reply',
  signedOut: 'Sign in to save your reply.',
} as const;

export const MANUAL = {
  trigger: 'Add past reply',
  heading: 'Add a reply you posted elsewhere',
  platform: 'Platform',
  reply: 'Your reply',
  source: 'Original post or comment',
  url: 'Post link',
  date: 'Posted date',
  dateUnknown: "I don't know",
  save: 'Save to library',
  cancel: 'Cancel',
  duplicate: 'You already have a reply with this text. Save it anyway?',
} as const;

export const NAV = {
  title: 'Social Replies',
  menu: 'Menu',
  library: 'Library',
  resources: 'Resources',
  facts: 'Facts',
  settings: 'Settings',
  workspace: 'Write a reply',
} as const;

export const PROGRESS = {
  label: 'Today',
  /** Counts can exceed the target. 11/10 is shown, not clamped (C09). */
  forPlatform: (platform: string, count: number, target: number) =>
    `${platform} ${count}/${target}`,
} as const;
