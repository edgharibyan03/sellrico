import {
  distinctiveSearchTokens,
  expandTokenStems,
  pickProductsMentionedInReply,
  rankProducts,
  scoreProduct,
  tokenizeQuery,
} from './catalog-search.rank';

describe('catalog search ranking', () => {
  const latch = {
    id: '1',
    name: 'Защелка межкомнатная ADDEN BAU WC 5070 Gold',
    description: null,
    category: 'Фурнитура',
    price: 0,
  };
  const threshold = {
    id: '2',
    name: 'Умный порог MORELLI под ширину двери 900мм',
    description: null,
    category: 'Фурнитура',
    price: 0,
  };
  const door = {
    id: '3',
    name: 'Межкомнатная дверь LINE WHITE белый soft',
    description: 'С зеркалом',
    category: 'Межкомнатные двери',
    price: 32900,
  };
  const piano = {
    id: '4',
    name: 'Межкомнатная дверь PIANO венге',
    description: null,
    category: 'Межкомнатные двери',
    price: 39400,
  };

  it('tokenizes russian queries', () => {
    expect(tokenizeQuery('межкомнатная дверь')).toEqual(['межкомнатная', 'дверь']);
  });

  it('drops chatty stopwords and keeps model names for fetch', () => {
    expect(tokenizeQuery('а есть двери лондон?')).toEqual(['двери', 'лондон']);
    expect(distinctiveSearchTokens('а есть двери лондон?')).toEqual(['лондон']);
    expect(expandTokenStems('лондон')).toEqual(
      expect.arrayContaining(['лондон', 'london']),
    );
  });

  it('ranks Лондон doors above unrelated doors for лондон queries', () => {
    const london = {
      id: '20',
      name: 'Входная дверь Лондон 29 - Капучино',
      description: null,
      category: 'LONDON',
      price: 54900,
    };
    const other = {
      id: '21',
      name: 'Дверь межкомнатная UniLine 30034 SoftTouch бьянка',
      description: null,
      category: 'Межкомнатные двери',
      price: 12850,
    };
    const ranked = rankProducts('а есть двери лондон?', [other, london], 8);
    expect(ranked.map((p) => p.id)).toEqual(['20']);
    expect(scoreProduct('лондон', london)).toBeGreaterThan(
      scoreProduct('лондон', other),
    );
  });

  it('ranks doors above accessories for door queries (auto industry)', () => {
    const ranked = rankProducts(
      'межкомнатная дверь',
      [latch, threshold, door, piano],
      8,
    );
    expect(ranked.map((p) => p.id)).toEqual(['3', '4']);
    expect(scoreProduct('межкомнатная дверь', door)).toBeGreaterThan(
      scoreProduct('межкомнатная дверь', latch),
    );
  });

  it('does not apply door accessory zeroing in generic industry', () => {
    const ranked = rankProducts(
      'межкомнатная дверь',
      [latch, door],
      8,
      { industry: 'generic' },
    );
    expect(ranked.map((p) => p.id)).toEqual(expect.arrayContaining(['1', '3']));
  });

  it('matches дверь against двери via light stemming', () => {
    const withGenitive = {
      ...door,
      name: 'Межкомнатные двери SKYLAB ясень',
    };
    expect(scoreProduct('межкомнатная дверь', withGenitive)).toBeGreaterThan(0);
  });

  it('picks products mentioned in the assistant reply', () => {
    const reply =
      'LINE WHITE — от 32 900 ₽\nPIANO — от 39 400 ₽\nSKYLAB — от 47 300 ₽';
    const picked = pickProductsMentionedInReply(reply, [
      latch,
      door,
      piano,
      { id: '5', name: 'Межкомнатная дверь SKYLAB' },
      threshold,
    ]);
    expect(picked.map((p) => p.id).sort()).toEqual(['3', '4', '5']);
  });

  it('excludes entrance doors when the query asks for interior doors', () => {
    const entrance = {
      id: '10',
      name: 'Входная дверь ART 13 - Белый софт',
      description: null,
      category: 'Входные двери',
      price: 39300,
    };
    const whiteInterior = {
      id: '11',
      name: 'Дверь межкомнатная UniLine 30034 SoftTouch бьянка',
      description: null,
      category: 'Межкомнатные двери',
      price: 12850,
    };

    const ranked = rankProducts(
      'белые межкомнатные двери',
      [entrance, whiteInterior, latch],
      8,
    );

    expect(ranked.map((p) => p.id)).toEqual(['11']);
    expect(scoreProduct('белые межкомнатные двери', entrance)).toBe(0);
  });

  it('ranks clothing by name, size, and color attributes', () => {
    const dress = {
      id: 'c1',
      name: 'Summer linen dress',
      description: 'Breathable day dress',
      category: 'Dresses',
      price: 89,
      attributes: { Color: 'Blue', Size: ['S', 'M', 'L'] },
      tags: ['summer', 'linen'],
    };
    const jeans = {
      id: 'c2',
      name: 'Slim fit jeans',
      description: null,
      category: 'Pants',
      price: 70,
      attributes: { Color: 'Black', Size: ['30', '32'] },
    };
    const ranked = rankProducts('blue linen dress size M', [jeans, dress], 8, {
      industry: 'generic',
    });
    expect(ranked[0]?.id).toBe('c1');
    expect(scoreProduct('blue linen dress size M', dress, { industry: 'generic' })).toBeGreaterThan(
      scoreProduct('blue linen dress size M', jeans, { industry: 'generic' }),
    );
  });

  it('ranks electronics by model and sku', () => {
    const phone = {
      id: 'e1',
      name: 'Acme Phone 15',
      description: '128GB storage',
      category: 'Phones',
      price: 799,
      sku: 'ACM-P15-128',
      attributes: { Storage: '128GB', Color: 'Black' },
    };
    const caseItem = {
      id: 'e2',
      name: 'Phone case silicone',
      description: 'Compatible with many phones',
      category: 'Accessories',
      price: 19,
      sku: 'CASE-01',
    };
    const ranked = rankProducts('Acme Phone 15 128GB', [caseItem, phone], 8, {
      industry: 'generic',
    });
    expect(ranked[0]?.id).toBe('e1');
    expect(scoreProduct('Acme Phone 15 128GB', phone, { industry: 'generic' })).toBeGreaterThan(
      scoreProduct('Acme Phone 15 128GB', caseItem, { industry: 'generic' }),
    );
  });

  it('ranks furniture by product type words', () => {
    const sofa = {
      id: 'f1',
      name: 'Modular sofa grey fabric',
      description: 'Living room sofa',
      category: 'Sofas',
      price: 1200,
    };
    const table = {
      id: 'f2',
      name: 'Oak dining table',
      description: null,
      category: 'Tables',
      price: 650,
    };
    const ranked = rankProducts('grey fabric sofa', [table, sofa], 8, {
      industry: 'generic',
    });
    expect(ranked[0]?.id).toBe('f1');
  });

  it('returns zero when distinctive model token is missing from product', () => {
    const shirt = {
      id: 'm1',
      name: 'Cotton t-shirt',
      description: null,
      category: 'Tops',
      price: 25,
    };
    expect(scoreProduct('Nike Air Max', shirt, { industry: 'generic' })).toBe(0);
  });

  it('does not invent attribute matches for missing specs', () => {
    const incomplete = {
      id: 'x1',
      name: 'Basic lamp',
      description: null,
      category: 'Lighting',
      price: 40,
      attributes: {},
    };
    // Shared type word can still match, but missing brand/spec tokens must not fabricate hits.
    expect(
      scoreProduct('brass floor lamp 160cm', incomplete, { industry: 'generic' }),
    ).toBeGreaterThan(0);
    expect(
      scoreProduct('Acme BrassPro 160cm', incomplete, { industry: 'generic' }),
    ).toBe(0);
  });
});
