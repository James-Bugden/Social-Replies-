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
export SR_OWNER_ID=...                                     # the enabled owner's uuid
```

`PRIVATE_OWNER_AUTHOR_IDS` is what lets an adapter prove a comment is yours.
Without it every authored row is sent to review, which is honest and useless.

`SR_OWNER_ID` is only a convenience for the shell below, so the uuid is typed
once instead of five times. It is not read by the CLI and it does not belong in
any committed file: the owner's id lives in `private.app_owner` and nowhere else
(C01). Read it from the database you are importing into, not from a note.

Put the export files under `PRIVATE_SOURCE_ROOT`. They are ignored by Git and the
private-path policy check fails the build if one is ever staged.

## The order to run things

```bash
npm run import -- validate --source linkedin --file comments.csv
npm run import -- dry-run  --source linkedin --file comments.csv --owner "$SR_OWNER_ID"
npm run import -- import   --source linkedin --file comments.csv --owner "$SR_OWNER_ID"
npm run import -- resume   --source linkedin --file comments.csv --owner "$SR_OWNER_ID"
npm run import -- report   --owner "$SR_OWNER_ID"
```

Three things about those commands are easy to get wrong.

`--owner` is required by every mode that touches the database. The CLI connects
directly, so there is no session and `auth.uid()` is null; without the flag the
run is refused with `error=owner_not_resolved` rather than writing rows with no
owner. The uuid is checked against the enabled owner before the first write, and
a uuid that is not that owner is refused with `error=not_the_enabled_owner`. That
refusal is doing real work: the policies require both `user_id = auth.uid()` and
the private owner check, so rows written under any other uuid commit cleanly and
are then unreadable by everybody, including you.

`resume` takes the same `--source` and `--file` as the run it is continuing. A
batch is identified by the file's hash and the adapter version, so the CLI has to
read the file again to work out which batch you mean. There is no `--batch` flag
and there never was.

`validate` is the one mode that needs neither `--owner` nor a database. It reads
and classifies the file and stops.

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
