/** UTC calendar month used as the AI usage billing period. */
export function currentUtcMonth(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export function historyCutoff(retentionDays: number | null, now = new Date()): Date | null {
  if (retentionDays == null) {
    return null;
  }
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}
