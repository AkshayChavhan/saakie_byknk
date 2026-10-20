/**
 * Product image sequence: the order an admin sets for a product's photos,
 * which is also the order customers see. Image 1 is the main photo.
 *
 * Pure helpers shared by the admin form (client) and the product API
 * (server), so both sides agree on what an "image order" is.
 */

/** Move one item to a new position, returning a new array. Out-of-range moves change nothing. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * One entry of an image order: an existing image's id (a Mongo ObjectId), or
 * `new:<n>` for the n-th file uploaded in the same request.
 */
const ORDER_TOKEN = /^(new:\d{1,2}|[a-f\d]{24})$/i;

/** Far above the 10-image upload cap, only to bound a hostile request. */
const MAX_ORDER_TOKENS = 30;

/**
 * Read the `imageOrder` form field. Returns the de-duplicated tokens, or null
 * when the field is absent or malformed (the caller then keeps the old
 * behaviour rather than guessing).
 */
export function parseImageOrder(raw: unknown): string[] | null {
  if (typeof raw !== 'string') return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length > MAX_ORDER_TOKENS) return null;
  if (!value.every((t) => typeof t === 'string' && ORDER_TOKEN.test(t))) return null;
  return Array.from(new Set(value as string[]));
}

/**
 * Turn an order (tokens) into the final list of image ids, first = main.
 *
 * Tokens naming an image that no longer exists (removed, or an upload index
 * that was never created) are dropped, and any kept or newly created image the
 * order forgot to mention is appended, so no photo can silently disappear
 * from the gallery.
 */
export function resolveImageOrder(opts: {
  order: readonly string[];
  /** Ids of the product's existing images that survive this save. */
  keptIds: readonly string[];
  /** Ids of the images created from this request's uploads, in upload order. */
  createdIds: readonly string[];
}): string[] {
  const { order, keptIds, createdIds } = opts;
  const valid = new Set<string>([...keptIds, ...createdIds]);
  const result: string[] = [];
  const push = (id: string | undefined) => {
    if (id && valid.has(id) && !result.includes(id)) result.push(id);
  };

  for (const token of order) {
    push(token.startsWith('new:') ? createdIds[Number(token.slice(4))] : token);
  }
  keptIds.forEach(push);
  createdIds.forEach(push);
  return result;
}
