import { SupabaseClient } from '@supabase/supabase-js';

interface CodeGeneratorOptions {
  table: string;
  column: string;
  prefix: string;
  digits?: number;
  sampleSize?: number;
}

export const CODE_PREFIXES = {
  branch: 'CN',
  customer: 'KH',
  customerGroup: 'NHOM',
  product: 'SP',
  supplier: 'NCC',
  salesOrder: 'DH',
  purchaseOrder: 'DN',
  receipt: 'PT',
  payment: 'PC',
  salesReturn: 'TH',
  invoice: 'HD',
} as const;

export async function generateNextCode(
  supabase: SupabaseClient,
  options: CodeGeneratorOptions,
) {
  const {
    table,
    column,
    prefix,
    digits = 7,
    sampleSize = 1000,
  } = options;

  const rows: Record<string, unknown>[] = [];

  for (let from = 0; ; from += sampleSize) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .like(column, `${prefix}%`)
      .range(from, from + sampleSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));

    if (!data || data.length < sampleSize) {
      break;
    }
  }

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`^${escapedPrefix}(\\d+)$`);

  const maxNumber = rows.reduce((max, row) => {
    const rawValue = row[column];
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
