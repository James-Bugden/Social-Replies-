import { z } from 'zod';

/**
 * C10. Configuration is read here and nowhere else.
 *
 * Missing configuration is a *state*, not a crash and not a fabricated success.
 * The app must still run with no provider keys at all: retrieval, editing, copying
 * and recording all work, and the generation section says it is not configured.
 *
 * `publicConfig()` reads only `NEXT_PUBLIC_*` values and is safe anywhere.
 * `serverConfig()` reads credentials and is called only from server code; nothing
 * that reaches the browser imports it. `configurationStatus()` is the shape the
 * settings screen renders: names and states, never values.
 */

/** Anything env-shaped: `process.env`, or a plain object in a test. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\//.test(v), 'must be an absolute http(s) URL')
  .transform((v) => (v === '' ? undefined : v.replace(/\/+$/, '')))
  .optional();

const publicSchema = z.object({
  APP_BASE_URL: optionalUrl,
  APP_TIMEZONE: z.string().default('Asia/Taipei'),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().optional(),
});

export interface PublicConfig {
  appBaseUrl?: string;
  timezone: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  /** Whether sign-in can work at all. */
  authConfigured: boolean;
}

export function publicConfig(source: EnvSource = process.env): PublicConfig {
  const parsed = publicSchema.parse({
    APP_BASE_URL: source.APP_BASE_URL ?? '',
    APP_TIMEZONE: source.APP_TIMEZONE ?? 'Asia/Taipei',
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  });

  const supabaseUrl = parsed.NEXT_PUBLIC_SUPABASE_URL;
  const key = parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined;

  return {
    ...(parsed.APP_BASE_URL ? { appBaseUrl: parsed.APP_BASE_URL } : {}),
    timezone: parsed.APP_TIMEZONE,
    ...(supabaseUrl ? { supabaseUrl } : {}),
    ...(key ? { supabasePublishableKey: key } : {}),
    authConfigured: Boolean(supabaseUrl && key),
  };
}

export type ProviderMode = 'fake' | 'live' | 'unconfigured';

export interface ServerConfig {
  resourceBaseUrl?: string;
  generation: {
    mode: ProviderMode;
    provider: string;
    model: string;
    apiKey?: string;
  };
  embedding: {
    mode: ProviderMode;
    provider: string;
    model: string;
    apiKey?: string;
  };
  privateSourceRoot?: string;
  privateEvalSetPath?: string;
}

function providerConfig(
  provider: string | undefined,
  model: string | undefined,
  apiKey: string | undefined,
  defaults: { provider: string; model: string },
): ServerConfig['generation'] {
  const name = (provider ?? '').trim().toLowerCase();

  if (name === 'fake') {
    return { mode: 'fake', provider: 'fake', model: model?.trim() || 'fake' };
  }
  if (name === '' || !apiKey?.trim()) {
    // Named but keyless, or not named at all. Either way there is no live provider,
    // and saying so is the only honest option.
    return {
      mode: 'unconfigured',
      provider: name || defaults.provider,
      model: model?.trim() || defaults.model,
    };
  }
  return {
    mode: 'live',
    provider: name,
    model: model?.trim() || defaults.model,
    apiKey: apiKey.trim(),
  };
}

export function serverConfig(source: EnvSource = process.env): ServerConfig {
  const resourceBaseUrl = optionalUrl.parse(source.RESOURCE_BASE_URL ?? '');

  return {
    ...(resourceBaseUrl ? { resourceBaseUrl } : {}),
    generation: providerConfig(source.AI_PROVIDER, source.AI_MODEL, source.AI_API_KEY, {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
    }),
    embedding: providerConfig(
      source.EMBEDDING_PROVIDER,
      source.EMBEDDING_MODEL,
      source.EMBEDDING_API_KEY,
      { provider: 'openai', model: 'text-embedding-3-small' },
    ),
    ...(source.PRIVATE_SOURCE_ROOT ? { privateSourceRoot: source.PRIVATE_SOURCE_ROOT } : {}),
    ...(source.PRIVATE_EVAL_SET_PATH ? { privateEvalSetPath: source.PRIVATE_EVAL_SET_PATH } : {}),
  };
}

/**
 * A description of configuration suitable for the settings screen: names and
 * status, never values (C10, SR-018).
 */
export function configurationStatus(source: EnvSource = process.env) {
  const pub = publicConfig(source);
  const server = serverConfig(source);
  return {
    auth: pub.authConfigured ? 'configured' : 'missing',
    generation: server.generation.mode,
    generation_model: server.generation.mode === 'live' ? server.generation.model : null,
    embedding: server.embedding.mode,
    embedding_model: server.embedding.mode === 'live' ? server.embedding.model : null,
    resource_origin: server.resourceBaseUrl ? 'configured' : 'missing',
    timezone: pub.timezone,
  } as const;
}
