export interface SyncCandidate {
  externalProductId: string;
}

/**
 * Keep updates to products already in the Shoppio index.
 * Accept new products only while the account is under its plan limit.
 * Nothing is removed from the merchant's WooCommerce store.
 */
export function selectProductsWithinLimit<T extends SyncCandidate>(input: {
  incoming: T[];
  existingExternalIds: Set<string>;
  accountProductCount: number;
  maxProducts: number;
}): { accepted: T[]; skipped: number } {
  let slots = Math.max(0, input.maxProducts - input.accountProductCount);
  const accepted: T[] = [];
  let skipped = 0;

  for (const item of input.incoming) {
    if (input.existingExternalIds.has(String(item.externalProductId))) {
      accepted.push(item);
      continue;
    }
    if (slots > 0) {
      accepted.push(item);
      slots -= 1;
      continue;
    }
    skipped += 1;
  }

  return { accepted, skipped };
}
