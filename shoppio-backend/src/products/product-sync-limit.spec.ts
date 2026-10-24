import { selectProductsWithinLimit } from './product-sync-limit';

function products(count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    externalProductId: `${prefix}-${index + 1}`,
    name: `${prefix} ${index + 1}`,
  }));
}

describe('product sync plan limits', () => {
  it('syncs up to the Free limit and skips the rest', () => {
    const existing = new Set(products(90, 'have').map((item) => item.externalProductId));
    const incoming = [...products(90, 'have'), ...products(20, 'new')];
    const result = selectProductsWithinLimit({
      incoming,
      existingExternalIds: existing,
      accountProductCount: 90,
      maxProducts: 100,
    });

    const created = result.accepted.filter((item) => item.externalProductId.startsWith('new-'));
    expect(created).toHaveLength(10);
    expect(result.skipped).toBe(10);
  });

  it('does not index products past 2,000 on Pro or 10,000 on Business', () => {
    for (const maxProducts of [2000, 10000]) {
      const result = selectProductsWithinLimit({
        incoming: products(5, 'new'),
        existingExternalIds: new Set(),
        accountProductCount: maxProducts,
        maxProducts,
      });
      expect(result.accepted).toHaveLength(0);
      expect(result.skipped).toBe(5);
    }
  });

  it('keeps updating existing products after a downgrade puts the account over the new limit', () => {
    const existing = new Set(['1', '2', '3']);
    const result = selectProductsWithinLimit({
      incoming: [
        { externalProductId: '1' },
        { externalProductId: '2' },
        { externalProductId: '99' },
      ],
      existingExternalIds: existing,
      accountProductCount: 3,
      maxProducts: 1,
    });

    expect(result.accepted.map((item) => item.externalProductId)).toEqual(['1', '2']);
    expect(result.skipped).toBe(1);
  });
});
