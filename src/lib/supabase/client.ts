'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser client, built only from values that are already public.
 *
 * There is no code path here that could read a server secret: the publishable key
 * and the project URL are the entire input. Anything else the browser needs comes
 * back from an API route that has already checked the owner boundary.
 */

let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  cached ??= createBrowserClient(url, key);
  return cached;
}
