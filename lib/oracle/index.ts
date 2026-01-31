import { supabase } from '../supabase';

// ============================================
// ORACLE BOT - TYPES
// ============================================

export interface OracleConfig {
  bot_enabled: boolean;
  fetch_interval_minutes: number;
  ai_provider: 'gemini' | 'openai';
  min_confidence_threshold: number;
  auto_approve_high_confidence: boolean;
  protocol_authority: string;
}

export interface OracleSource {
  id: string;
  name: string;
  display_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  last_fetched: string | null;
  last_error: string | null;
  fetch_count: number;
  error_count: number;
  fetch_interval_minutes: number;
}

export interface ResolutionSuggestion {
  id: string;
  market_slug: string;
  market_title: string;
  suggested_outcome: 'YES' | 'NO' | 'UNCERTAIN';
  confidence: number;
  evidence: Evidence[];
  ai_analysis: string;
  ai_provider: string;
  sources_used: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface Evidence {
  url: string;
  title: string;
  snippet: string;
  source: string;
  timestamp?: string;
}

export interface OracleLog {
  id: string;
  type: 'system' | 'fetch' | 'analyze' | 'suggest' | 'approve' | 'reject' | 'error' | 'warning';
  source: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OracleStatus {
  enabled: boolean;
  last_run: string | null;
  pending_suggestions: number;
  sources: {
    name: string;
    display_name: string;
    enabled: boolean;
    last_fetched: string | null;
    status: 'active' | 'error' | 'disabled';
  }[];
}

// ============================================
// CONFIG HELPERS
// ============================================

export async function getOracleConfig(): Promise<OracleConfig> {
  const { data, error } = await supabase
    .from('oracle_config')
    .select('key, value');

  if (error) throw error;

  const config: Record<string, unknown> = {};
  data?.forEach(row => {
    config[row.key] = row.value;
  });

  return {
    bot_enabled: config.bot_enabled as boolean ?? false,
    fetch_interval_minutes: config.fetch_interval_minutes as number ?? 15,
    ai_provider: config.ai_provider as 'gemini' | 'openai' ?? 'gemini',
    min_confidence_threshold: config.min_confidence_threshold as number ?? 70,
    auto_approve_high_confidence: config.auto_approve_high_confidence as boolean ?? false,
    protocol_authority: config.protocol_authority as string ?? '',
  };
}

export async function updateOracleConfig(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from('oracle_config')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw error;
}

// ============================================
// SOURCES HELPERS
// ============================================

export async function getOracleSources(): Promise<OracleSource[]> {
  const { data, error } = await supabase
    .from('oracle_sources')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getEnabledSources(): Promise<OracleSource[]> {
  const { data, error } = await supabase
    .from('oracle_sources')
    .select('*')
    .eq('enabled', true);

  if (error) throw error;
  return data || [];
}

export async function updateSourceConfig(name: string, config: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('oracle_sources')
    .update({ config })
    .eq('name', name);

  if (error) throw error;
}

export async function toggleSource(name: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('oracle_sources')
    .update({ enabled })
    .eq('name', name);

  if (error) throw error;
}

// ============================================
// SUGGESTIONS HELPERS
// ============================================

export async function getPendingSuggestions(): Promise<ResolutionSuggestion[]> {
  const { data, error } = await supabase
    .from('resolution_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSuggestion(suggestion: Omit<ResolutionSuggestion, 'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'review_notes' | 'created_at'>): Promise<ResolutionSuggestion | null> {
  const { data, error } = await supabase
    .from('resolution_suggestions')
    .insert(suggestion)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveSuggestion(id: string, reviewerWallet: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from('resolution_suggestions')
    .update({
      status: 'approved',
      reviewed_by: reviewerWallet,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function rejectSuggestion(id: string, reviewerWallet: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from('resolution_suggestions')
    .update({
      status: 'rejected',
      reviewed_by: reviewerWallet,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
    })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// LOGGING HELPERS
// ============================================

/**
 * Updates the Draco UI (Command Center) in real-time by hitting the local API.
 * Now supports the new structured dog results (dog1Result, etc.)
 */
export async function updateMarketDogLogs(marketId: string, dogNumber: 1 | 2 | 3, data: { logs?: string[]; score?: number; report?: string; verdict?: string; requiresHuman?: boolean }): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3002';

    const field = `dog${dogNumber}Result`;

    await fetch(`${baseUrl}/api/markets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: marketId,
        [field]: data
      })
    });
  } catch (e) {
    console.error('[Cerberus] Failed to update live logs:', e);
  }
}

export async function logOracleEvent(
  type: OracleLog['type'],
  message: string,
  source?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('oracle_logs')
    .insert({
      type,
      source: source || 'system',
      message,
      metadata: metadata || {},
    });

  if (error) console.error('Failed to log oracle event:', error);
}

export async function getOracleLogs(limit: number = 100): Promise<OracleLog[]> {
  const { data, error } = await supabase
    .from('oracle_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Real-time subscription
export function subscribeToLogs(callback: (log: OracleLog) => void) {
  return supabase
    .channel('oracle_logs_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'oracle_logs' },
      (payload) => callback(payload.new as OracleLog)
    )
    .subscribe();
}

// ============================================
// STATUS HELPERS
// ============================================

export async function getOracleStatus(): Promise<OracleStatus> {
  const [config, sources, pendingCount] = await Promise.all([
    getOracleConfig(),
    getOracleSources(),
    supabase
      .from('resolution_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  // Get last fetch time
  const lastFetch = sources
    .filter(s => s.last_fetched)
    .sort((a, b) => new Date(b.last_fetched!).getTime() - new Date(a.last_fetched!).getTime())[0];

  // Merge with default sources that might not be in DB yet
  const dbSourceNames = new Set(sources.map(s => s.name));

  const defaultSources = [
    { name: 'yahoo', display_name: 'Yahoo Finance' },
    { name: 'dexscreener', display_name: 'DexScreener' }
  ];

  const mergedSources = [...sources];

  defaultSources.forEach(def => {
    if (!dbSourceNames.has(def.name)) {
      mergedSources.push({
        id: 'system-' + def.name,
        name: def.name,
        display_name: def.display_name,
        enabled: true, // Enabled by default in code
        config: {},
        last_fetched: null,
        last_error: null,
        fetch_count: 0,
        error_count: 0,
        fetch_interval_minutes: 15
      });
    }
  });

  return {
    enabled: config.bot_enabled,
    last_run: lastFetch?.last_fetched || null,
    pending_suggestions: pendingCount.count || 0,
    sources: mergedSources.map(s => ({
      name: s.name,
      display_name: s.display_name,
      enabled: s.enabled,
      last_fetched: s.last_fetched,
      status: !s.enabled ? 'disabled' : s.last_error ? 'error' : 'active',
    })),
  };
}
