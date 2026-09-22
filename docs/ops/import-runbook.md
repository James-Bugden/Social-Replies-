# Import runbook

SR-007 (#8) and SR-008 (#9). How to bring historical replies in, and what the
result is allowed to claim afterwards.

This runs **locally**, against files that never enter this repository and never
travel through the app's HTTP endpoints. Nothing here is a claim that any import
has happened: at the time of writing, **no authorised export has been inspected**
and every adapter is labelled `synthetic-tested`.

## Before anything

```bash
export PRIVATE_SOURCE_ROOT=/path/to/your/private/exports   # never committed
export SUPABASE_DB_URL=postgres://...                      # server-side credential
export PRIVATE_OWNER_AUTHOR_IDS=...                        # your platform author ids
```

`PRIVATE_OWNER_AUTHOR_IDS` is what lets an adapter prove a comment is yours.
Without it every authored row is sent to review, which is honest and useless.

Put the export files under `PRIVATE_SOURCE_ROOT`. They are ignored by Git and the
private-path policy check fails the build if one is ever staged.

## The order to run things

```bash
npm run import -- validate  --source linkedin --file comments.csv
npm run import -- dry-run   --source linkedin --file comments.csv
npm run import -- import    --source linkedin --file comments.csv
npm run import -- resume    --batch <id>      # after an interruption
npm run import -- report    --batch <id>
```

Do not skip `dry-run`. It parses everything and writes nothing, and its
disposition counts are how you find out that an adapter's assumption about the
export's shape is wrong *before* a few thousand rows land.

## What to check in the dry run

| Count | What a surprising number means |
|---|---|
| `needs_review` high | The adapter cannot prove authorship or reply-vs-post. Usually `PRIVATE_OWNER_AUTHOR_IDS` is unset or wrong |
| `invalid` high | The schema is not what the adapter expects. Read the warning codes, then fix the mapping. Do not loosen the parser to make the number go down |
| `duplicate` high on a first run | Two exports overlap, which is fine, or the identity tier is falling through to file position, which is not |
| `imported` suspiciously round | Check the record count against the file itself |

Warning codes are printed; reply text and file paths are not. That is deliberate,
so a terminal scrollback or a pasted log cannot leak the corpus.

## What the result may claim

Each adapter reports its own status and the report repeats it:

- `synthetic-tested` means the parser passes against invented sample files. **This
  is where all four adapters are today.**
- `real-export-validated` means a real export was inspected and the mapping
  documented.
- `backfilled` means records from that source are in the library.
- `awaiting source` means the export does not exist yet.

One file imported is never "my account history". The coverage ledger records files
inspected, records seen, imported, duplicate, review, invalid, missing context and
the known date range, **per source**, and names the sources it could not reach.
Report those numbers rather than rounding them into a sentence.

## Things the importer will not do, by design

- **Guess a date.** Import time is never posting time. An unknown date stays
  unknown, and a date-only value keeps its precision and its source timezone. An
  undated reply never counts towards today.
- **Merge on text.** Identical wording under two different posts is two events.
  Only a native reply id, a verified canonical URL or a stable export record id
  merges two records; text and date similarity are review signals.
- **Evaluate an archive.** An X archive stores its data as a JavaScript
  assignment. The prefix is stripped and the remainder is parsed as JSON. Nothing
  is ever passed to `eval` or `new Function`, and a payload that is an expression
  rather than data is rejected.
- **Promote a guess.** A comment whose author cannot be proved, or a record that
  might be a main post, goes to review. A classifier cannot establish that you
  posted something.
- **Rewrite your words.** `final_text` keeps the bytes as supplied, including CJK,
  emoji, trailing whitespace and line endings. Normalisation goes into
  `search_text`, which is a separate column.

## After an import

Imported replies are lexically searchable immediately, because the importer writes
the search row. Embeddings are a separate concern and are queued by the app's own
save path, not by this. If you want vectors over imported history, that is a
backfill job and it does not exist yet.

Check a handful of rows by hand against the source file. Specifically check one
undated record, one with CJK, and one you know appeared in two exports. Those are
the three the parser is most likely to be quietly wrong about.
