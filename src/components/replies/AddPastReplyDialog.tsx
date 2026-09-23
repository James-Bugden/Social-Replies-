'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button, StatusLine } from './primitives';
import { MANUAL } from '@/lib/workspace/copy';
import { PLATFORM_LABELS, type Platform } from '@/lib/contracts/vocabulary';
import { api, ApiError, newOperationKey } from '@/lib/workspace/client';
import type { Progress } from '@/lib/contracts/api';

/**
 * Add past reply (D11).
 *
 * The date defaults to unknown and stays unknown unless the owner says otherwise.
 * That is the whole point of this dialog: it captures replies written before the
 * app existed or written outside it, and a reply that quietly became "posted
 * today" would inflate today's count and then be wrong forever, because nothing
 * later can tell a real today from a defaulted one.
 *
 * Cancelling preserves the workspace exactly as it was, and closing returns focus
 * to the control that opened it (D13).
 */

export interface AddPastReplyDialogProps {
  platform: Platform;
  onClose(): void;
  onSaved(progress: Progress): void;
}

export function AddPastReplyDialog({ platform, onClose, onSaved }: AddPastReplyDialogProps) {
  const headingId = useId();
  const replyId = useId();
  const sourceId = useId();
  const dateId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [chosenPlatform, setChosenPlatform] = useState<Platform>(platform);
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [url, setUrl] = useState('');
  const [dateKnown, setDateKnown] = useState(false);
  const [date, setDate] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle');
  const operationKey = useRef<string | null>(null);

  useEffect(() => {
    // Escape closes the dialog. It never discards the workspace draft behind it.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.querySelector('textarea')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function save() {
    if (text.trim() === '') return;
    operationKey.current ??= newOperationKey();
    setState('saving');
    try {
      const result = await api.manualReply(
        {
          platform: chosenPlatform,
          final_text: text,
          date_precision: dateKnown && date !== '' ? 'date_only' : 'unknown',
          ...(dateKnown && date !== ''
            ? { posted_date: date, source_timezone: 'Asia/Taipei' }
            : {}),
          ...(source.trim() !== '' ? { source_text: source } : {}),
          ...(url.trim() !== '' ? { reply_url: url } : {}),
        },
        operationKey.current,
      );
      onSaved(result.progress);
      onClose();
    } catch (error) {
      setState('failed');
      if (error instanceof ApiError && error.envelope.code === 'idempotency_conflict') {
        // A changed payload under the same key means this is a different reply.
        operationKey.current = null;
      }
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="max-h-full w-full max-w-[560px] overflow-y-auto rounded-lg border border-hairline bg-card p-4"
      >
        <h2 id={headingId} className="text-[0.9375rem] font-semibold">
          {MANUAL.heading}
        </h2>

        <fieldset className="mt-3">
          <legend className="mb-1 text-meta font-medium">{MANUAL.platform}</legend>
          <div role="radiogroup" aria-label={MANUAL.platform} className="flex flex-wrap gap-2">
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={chosenPlatform === option}
                onClick={() => setChosenPlatform(option)}
                className={`min-h-8 rounded-full border px-3 text-meta ${
                  chosenPlatform === option
                    ? 'border-green bg-green-soft font-medium text-green'
                    : 'border-border-input bg-card text-ink-soft'
                }`}
              >
                {PLATFORM_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor={replyId} className="mt-3 mb-1 block text-meta font-medium">
          {MANUAL.reply}
        </label>
        <textarea
          id={replyId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          lang={chosenPlatform === 'threads' ? 'zh-TW' : 'en'}
          className={`w-full resize-y rounded-md border border-border-input bg-card p-3 text-reply ${
            chosenPlatform === 'threads' ? 'sr-cjk' : ''
          }`}
        />

        <label htmlFor={sourceId} className="mt-3 mb-1 block text-meta font-medium">
          {MANUAL.source}
        </label>
        <textarea
          id={sourceId}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-border-input bg-card p-3 text-meta"
        />

        <label htmlFor={`${sourceId}-url`} className="mt-3 mb-1 block text-meta font-medium">
          {MANUAL.url}
        </label>
        <input
          id={`${sourceId}-url`}
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-md border border-border-input bg-card px-3 py-2 text-meta"
        />

        <fieldset className="mt-3">
          <legend className="mb-1 text-meta font-medium">{MANUAL.date}</legend>
          <label className="flex items-center gap-2 text-meta">
            <input
              type="checkbox"
              checked={!dateKnown}
              onChange={(event) => setDateKnown(!event.target.checked)}
            />
            {MANUAL.dateUnknown}
          </label>
          {dateKnown ? (
            <input
              id={dateId}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 rounded-md border border-border-input bg-card px-3 py-2 text-meta"
            />
          ) : null}
        </fieldset>

        {state === 'failed' ? (
          <StatusLine tone="error">Could not save that reply. Your text is still here.</StatusLine>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="primary"
            onClick={save}
            disabled={state === 'saving' || text.trim() === ''}
          >
            {MANUAL.save}
          </Button>
          <Button size="primary" onClick={onClose}>
            {MANUAL.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
