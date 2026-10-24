/**
 * Rank catalog search hits so accessory noise (latches, hinges, seals)
 * does not outrank the actual product the customer asked for.
 */

export interface RankableProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
}

const ACCESSORY_RE =
  /защелк|защёлк|петл|порог|ручк|замок|уплотни|цилиндр|завертк|наличник|доводчик|seal|hinge|latch|handle|lock\b|threshold/i;

const DOOR_INTENT_RE = /двер|door|полотн/i;
const INTERIOR_DOOR_RE = /межкомнат/i;
const ENTRANCE_DOOR_RE =
  /входн|металлоконструк|взломостойк|front\s*door|entry\s*door|exterior\s*door/i;

export type DoorKind = 'interior' | 'entrance';

export function detectDoorKind(text: string): DoorKind | null {
  const value = text.toLowerCase();
  const interior = INTERIOR_DOOR_RE.test(value);
  const entrance = ENTRANCE_DOOR_RE.test(value);
  if (interior && !entrance) return 'interior';
  if (entrance && !interior) return 'entrance';
  return null;
}

/** Chatty words that match too many rows and bury model names. */
const STOPWORDS = new Set([
  'есть',
  'ли',
  'мне',
  'меня',
  'можно',
  'нужен',
  'нужна',
  'нужно',
  'нужны',
  'хочу',
  'покажи',
  'найди',
  'какие',
  'какой',
  'какая',
  'какое',
  'что',
  'это',
  'или',
  'для',
  'про',
  'the',
  'and',
  'for',
  'with',
  'show',
  'find',
  'have',
  'has',
  'any',
  'some',
  'please',
  'looking',
]);

/** Tokens that are product-type intent, not a specific model/brand. */
const GENERIC_PRODUCT_RE =
  /^(двер[а-яё]*|doors?|полотн[а-яё]*|товар[а-яё]*|products?)$/i;

const CYR_TO_LAT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

const LAT_TO_CYR: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'й',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'кс',
  y: 'и',
  z: 'з',
};

function transliterateCyrToLat(token: string): string {
  return [...token].map((ch) => CYR_TO_LAT[ch] ?? ch).join('');
}

function transliterateLatToCyr(token: string): string {
  return [...token].map((ch) => LAT_TO_CYR[ch] ?? ch).join('');
}

/** Expand a token with light stems + latin/cyrillic twins (лондон ↔ london). */
export function expandTokenStems(token: string): string[] {
  const stems = new Set<string>([token]);
  if (token.length >= 4) stems.add(token.slice(0, -1));
  if (token.length >= 5) stems.add(token.slice(0, -2));

  const hasCyr = /[а-яё]/i.test(token);
  const hasLat = /[a-z]/i.test(token);
  if (hasCyr) {
    const lat = transliterateCyrToLat(token);
    if (lat && lat !== token) {
      stems.add(lat);
      if (lat.length >= 4) stems.add(lat.slice(0, -1));
    }
  }
  if (hasLat && !hasCyr) {
    const cyr = transliterateLatToCyr(token);
    if (cyr && cyr !== token) {
      stems.add(cyr);
      if (cyr.length >= 4) stems.add(cyr.slice(0, -1));
    }
  }

  return [...stems].filter((s) => s.length >= 2);
}

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9а-яё]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    .slice(0, 8);
}

/**
 * Prefer model/brand tokens for DB candidate fetch so broad words like
 * "двери" do not fill the candidate window and drop "Лондон".
 */
export function distinctiveSearchTokens(query: string): string[] {
  const tokens = tokenizeQuery(query);
  const distinctive = tokens.filter((t) => !GENERIC_PRODUCT_RE.test(t));
  return distinctive.length > 0 ? distinctive : tokens;
}

/** Light stem so "дверь" matches "двери" / "дверью". */
export function tokenVariants(token: string): string[] {
  const variants = new Set<string>([token]);
  if (token.length >= 4) {
    variants.add(token.slice(0, -1));
  }
  if (token.length >= 5) {
    variants.add(token.slice(0, -2));
  }
  // Common Russian noun endings stripped once more if still long.
  for (const ending of ['ами', 'ями', 'ов', 'ей', 'ий', 'ый', 'ая', 'ое', 'ые', 'ие']) {
    if (token.endsWith(ending) && token.length - ending.length >= 3) {
      variants.add(token.slice(0, -ending.length));
    }
  }
  return [...variants];
}

function fieldContainsToken(field: string, token: string): boolean {
  const hay = field.toLowerCase();
  if (hay.includes(token)) {
    return true;
  }
  const variants = new Set([...tokenVariants(token), ...expandTokenStems(token)]);
  return [...variants].some((v) => v.length >= 3 && hay.includes(v));
}

export function scoreProduct(query: string, product: RankableProduct): number {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return 0;
  }

  const name = product.name ?? '';
  const category = product.category ?? '';
  const description = product.description ?? '';
  const blob = `${name} ${category} ${description}`;
  const queryLower = query.toLowerCase().trim();

  let score = 0;
  let nameHits = 0;
  let anyHits = 0;

  const distinctive = tokens.filter((t) => !GENERIC_PRODUCT_RE.test(t));
  if (distinctive.length > 0) {
    const distinctiveHits = distinctive.filter(
      (token) =>
        fieldContainsToken(name, token) ||
        fieldContainsToken(category, token) ||
        fieldContainsToken(description, token),
    );
    // Model/brand terms are mandatory once present (лондон, uniline, …).
    if (distinctiveHits.length === 0) {
      return 0;
    }
    score += distinctiveHits.length * 28;
  }

  for (const token of tokens) {
    const inName = fieldContainsToken(name, token);
    const inCategory = fieldContainsToken(category, token);
    const inDescription = fieldContainsToken(description, token);
    if (inName) {
      score += 12;
      nameHits += 1;
      anyHits += 1;
    } else if (inCategory) {
      score += 6;
      anyHits += 1;
    } else if (inDescription) {
      score += 3;
      anyHits += 1;
    }
  }

  if (nameHits === tokens.length) {
    score += 40;
  } else if (anyHits === tokens.length) {
    score += 18;
  }

  if (queryLower.length >= 4 && name.toLowerCase().includes(queryLower)) {
    score += 30;
  }

  const doorIntent = DOOR_INTENT_RE.test(query);
  const queryDoorKind = detectDoorKind(query);
  const productDoorKind = detectDoorKind(`${name} ${category}`);
  // "под ширину двери" on a threshold is not a door product.
  const looksLikeAccessory = ACCESSORY_RE.test(name);
  const looksLikeDoor =
    !looksLikeAccessory &&
    (/(?:^|[\s«"'])(?:межкомнатн\w*\s+|входн\w*\s+)?(?:двер|door|полотн)/i.test(name) ||
      DOOR_INTENT_RE.test(category));

  if (doorIntent && looksLikeAccessory) {
    return 0;
  }
  if (doorIntent && looksLikeDoor) {
    score += 25;
  }

  // Hard preference: "межкомнатные" must not surface entrance doors (and vice versa).
  if (queryDoorKind && productDoorKind && queryDoorKind !== productDoorKind) {
    return 0;
  }
  if (
    !looksLikeAccessory &&
    queryDoorKind &&
    productDoorKind === queryDoorKind
  ) {
    score += 45;
  }

  // Prefer in-stock priced catalog items over zero-price accessories when scores tie later.
  if (product.price != null && product.price > 0) {
    score += 1;
  }

  return score;
}

export function rankProducts<T extends RankableProduct>(
  query: string,
  products: T[],
  limit: number,
): T[] {
  const queryDoorKind = detectDoorKind(query);
  const scored = products
    .map((product) => ({ product, score: scoreProduct(query, product) }))
    .filter((row) => row.score > 0);

  // If the shopper asked for interior/entrance doors and we have matching hits,
  // drop the opposite kind even if a weak color/token match slipped through.
  const filtered =
    queryDoorKind == null
      ? scored
      : (() => {
          const matchedKind = scored.filter((row) => {
            const kind = detectDoorKind(
              `${row.product.name} ${row.product.category ?? ''}`,
            );
            return kind === queryDoorKind;
          });
          return matchedKind.length > 0 ? matchedKind : scored;
        })();

  return filtered
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const ap = a.product.price;
      const bp = b.product.price;
      if (ap == null && bp == null) return 0;
      if (ap == null) return 1;
      if (bp == null) return -1;
      return ap - bp;
    })
    .slice(0, limit)
    .map((row) => row.product);
}

/** Prefer products whose names are actually referenced in the assistant reply. */
export function pickProductsMentionedInReply<T extends { name: string }>(
  reply: string,
  products: T[],
): T[] {
  const text = reply.toLowerCase();
  if (!text.trim() || products.length === 0) {
    return [];
  }

  return products.filter((product) => {
    const name = product.name.trim();
    if (!name) return false;
    const lower = name.toLowerCase();
    if (text.includes(lower)) {
      return true;
    }

    // Match distinctive chunks (model names like "LINE WHITE", "SKYLAB").
    const chunks = lower
      .split(/[^a-z0-9а-яё]+/i)
      .map((c) => c.trim())
      .filter((c) => c.length >= 4);

    const distinctive = chunks.filter(
      (c) => !/^(межкомнатн\w*|двер\w*|door|белый|белая|цвет|модель|серия|soft|венге|ясень)/i.test(c),
    );

    if (distinctive.length === 0) {
      return chunks.filter((c) => text.includes(c)).length >= Math.min(2, chunks.length);
    }

    // Latin/model tokens (LINE, PIANO, SKYLAB) are strong enough alone.
    const strongHits = distinctive.filter(
      (c) => /[a-z]/i.test(c) && text.includes(c),
    );
    if (strongHits.length >= 1) {
      return true;
    }

    const hits = distinctive.filter((c) => text.includes(c)).length;
    return hits >= Math.min(2, distinctive.length) || (distinctive.length === 1 && hits === 1);
  });
}
