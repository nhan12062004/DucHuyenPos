import { SupabaseClient } from '@supabase/supabase-js';

interface CodeGeneratorOptions {
  table: string;
  column: string;
  prefix: string;
  digits?: number;
  sampleSize?: number;
}

export async function generateNextCode(
  supabase: SupabaseClient,
  options: CodeGeneratorOptions,
) {
  const {
    table,
    column,
    prefix,
    digits = 6,
    sampleSize = 20,
  } = options;

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .like(column, `${prefix}%`)
    .order(column, { ascending: false })
    .limit(sampleSize);

  if (error) {
    throw new Error(error.message);
  }

  const matcher = new RegExp(`^${prefix}(\\d+)$`);

  const maxNumber = (data ?? []).reduce((max, row) => {
    const rawValue = row?.[column as keyof typeof row];
    if (typeof rawValue !== 'string') {
      return max;
    }

    const match = rawValue.match(matcher);
    if (!match) {
      return max;
    }

    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) {
      return max;
    }

    return Math.max(max, parsed);
  }, 0);

  return `${prefix}${String(maxNumber + 1).padStart(digits, '0')}`;
}

export function normalizeManualCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized || undefined;
}
