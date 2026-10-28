/**
 * Rank catalog search hits by generic relevance.
 * Optional industry profiles (e.g. doors) add vertical-specific boosts/filters.
 */

export type SearchIndustry = 'auto' | 'generic' | 'doors';

export interface RankableProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  sku?: string | null;
  tags?: string[] | null;
  attributes?: Record<string, string | string[]> | null;
}

export interface RankOptions {
  /** Default: auto — apply doors rules only when the query looks door-related. */
  industry?: SearchIndustry;
}

const DOOR_ACCESSORY_RE =
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

/**
 * Tokens that are product-type intent, not a specific model/brand.
 * Kept broad so category nouns do not dominate distinctive model tokens.
 */
const GENERIC_PRODUCT_RE =
  /^(двер[а-яё]*|doors?|полотн[а-яё]*|товар[а-яё]*|products?|item[а-яё]*|items?)$/i;

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
 * "двери" / "products" do not fill the candidate window.
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
  for (const ending of ['ами', 'ями', 'ов', 'ей', 'ий', 'ый', 'ая', 'ое', 'ые', 'ие']) {
    if (token.endsWith(ending) && token.length - ending.length >= 3) {
      variants.add(token.slice(0, -ending.length));
    }
  }
  return [...variants];
}

function attributesBlob(
  attributes: Record<string, string | string[]> | null | undefined,
): string {
  if (!attributes || typeof attributes !== 'object') {
    return '';
  }
  return Object.entries(attributes)
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return [key, ...values.map((v) => String(v))];
    })
    .join(' ');
}

function productSearchBlob(product: RankableProduct): {
  name: string;
  category: string;
  description: string;
  sku: string;
  tags: string;
  attributes: string;
  all: string;
} {
  const name = product.name ?? '';
  const category = product.category ?? '';
  const description = product.description ?? '';
  const sku = product.sku ?? '';
  const tags = (product.tags ?? []).join(' ');
  const attributes = attributesBlob(product.attributes);
  return {
    name,
    category,
    description,
    sku,
    tags,
    attributes,
    all: `${name} ${category} ${description} ${sku} ${tags} ${attributes}`,
  };
}

function fieldContainsToken(field: string, token: string): boolean {
  const hay = field.toLowerCase();
  if (hay.includes(token)) {
    return true;
  }
  const variants = new Set([...tokenVariants(token), ...expandTokenStems(token)]);
  return [...variants].some((v) => v.length >= 3 && hay.includes(v));
}

function resolveDoorsProfile(
  industry: SearchIndustry,
  query: string,
): boolean {
  if (industry === 'doors') return true;
  if (industry === 'generic') return false;
  // auto: only when the shopper's query is clearly door-related
  return DOOR_INTENT_RE.test(query) || detectDoorKind(query) != null;
}

export function scoreProduct(
  query: string,
  product: RankableProduct,
  options: RankOptions = {},
): number {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return 0;
  }

  const fields = productSearchBlob(product);
  const queryLower = query.toLowerCase().trim();
  const industry = options.industry ?? 'auto';
  const useDoors = resolveDoorsProfile(industry, query);

  let score = 0;
  let nameHits = 0;
  let anyHits = 0;

  const distinctive = tokens.filter((t) => !GENERIC_PRODUCT_RE.test(t));
  if (distinctive.length > 0) {
    const distinctiveHits = distinctive.filter(
      (token) =>
        fieldContainsToken(fields.name, token) ||
        fieldContainsToken(fields.category, token) ||
        fieldContainsToken(fields.description, token) ||
        fieldContainsToken(fields.sku, token) ||
        fieldContainsToken(fields.tags, token) ||
        fieldContainsToken(fields.attributes, token),
    );
    // Model/brand/spec terms are mandatory once present.
    if (distinctiveHits.length === 0) {
      return 0;
    }
    score += distinctiveHits.length * 28;
  }

  for (const token of tokens) {
    const inName = fieldContainsToken(fields.name, token);
    const inSku = fieldContainsToken(fields.sku, token);
    const inCategory = fieldContainsToken(fields.category, token);
    const inTags = fieldContainsToken(fields.tags, token);
    const inAttributes = fieldContainsToken(fields.attributes, token);
    const inDescription = fieldContainsToken(fields.description, token);
    if (inName) {
      score += 12;
      nameHits += 1;
      anyHits += 1;
    } else if (inSku) {
      score += 11;
      anyHits += 1;
    } else if (inCategory) {
      score += 6;
      anyHits += 1;
    } else if (inTags || inAttributes) {
      score += 5;
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

  if (queryLower.length >= 4 && fields.name.toLowerCase().includes(queryLower)) {
    score += 30;
  }

  if (useDoors) {
    const doorIntent = DOOR_INTENT_RE.test(query);
    const queryDoorKind = detectDoorKind(query);
    const productDoorKind = detectDoorKind(`${fields.name} ${fields.category}`);
    const looksLikeAccessory = DOOR_ACCESSORY_RE.test(fields.name);
    const looksLikeDoor =
      !looksLikeAccessory &&
      (/(?:^|[\s«"'])(?:межкомнатн\w*\s+|входн\w*\s+)?(?:двер|door|полотн)/i.test(
        fields.name,
      ) ||
        DOOR_INTENT_RE.test(fields.category));

    if (doorIntent && looksLikeAccessory) {
      return 0;
    }
    if (doorIntent && looksLikeDoor) {
      score += 25;
    }
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
  }

  if (product.price != null && product.price > 0) {
    score += 1;
  }

  return score;
}

export function rankProducts<T extends RankableProduct>(
  query: string,
  products: T[],
  limit: number,
  options: RankOptions = {},
): T[] {
  const industry = options.industry ?? 'auto';
  const useDoors = resolveDoorsProfile(industry, query);
  const queryDoorKind = useDoors ? detectDoorKind(query) : null;

  const scored = products
    .map((product) => ({
      product,
      score: scoreProduct(query, product, options),
    }))
    .filter((row) => row.score > 0);

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

    const chunks = lower
      .split(/[^a-z0-9а-яё]+/i)
      .map((c) => c.trim())
      .filter((c) => c.length >= 4);

    // Generic filler words — not distinctive product identity.
    const distinctive = chunks.filter(
      (c) =>
        !/^(товар\w*|product\w*|цвет|модель|серия|size|color|colour|межкомнатн\w*|двер\w*|door)$/i.test(
          c,
        ),
    );

    if (distinctive.length === 0) {
      return chunks.filter((c) => text.includes(c)).length >= Math.min(2, chunks.length);
    }

    const strongHits = distinctive.filter(
      (c) => /[a-z0-9]/i.test(c) && text.includes(c),
    );
    if (strongHits.length >= 1) {
      return true;
    }

    const hits = distinctive.filter((c) => text.includes(c)).length;
    return (
      hits >= Math.min(2, distinctive.length) ||
      (distinctive.length === 1 && hits === 1)
    );
  });
}
