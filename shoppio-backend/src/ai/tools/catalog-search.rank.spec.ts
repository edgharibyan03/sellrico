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

  it('ranks doors above accessories for door queries', () => {
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
});
