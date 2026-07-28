import prisma from '@/lib/prisma';

/**
 * The active category tree, keyed parent id -> child ids.
 *
 * Only active categories take part: an inactive category is hidden from the
 * storefront, so its products must not be rolled up into an ancestor's total.
 */
async function loadActiveTree() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });

  const childIds = new Map<string, string[]>();
  for (const { id, parentId } of categories) {
    if (!parentId) continue;
    const siblings = childIds.get(parentId);
    if (siblings) siblings.push(id);
    else childIds.set(parentId, [id]);
  }

  return { childIds, ids: categories.map((category) => category.id) };
}

/**
 * A category id plus every descendant id, at any depth.
 *
 * `seen` is not just an optimisation — the schema's self-relation has nothing
 * stopping a category from becoming its own ancestor, and an unguarded walk
 * would recurse forever on such a cycle.
 */
function collectSubtree(rootId: string, childIds: Map<string, string[]>) {
  const ids: string[] = [];
  const seen = new Set<string>();
  const stack = [rootId];

  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    stack.push(...(childIds.get(id) ?? []));
  }

  return ids;
}

/**
 * Active product totals per category, counting the category's own products
 * plus those of every active descendant.
 *
 * Most products hang off sub-categories rather than the top-level category, so
 * a direct `_count` reads 0 for categories that are far from empty. Mongo has
 * no recursive query through Prisma, so the rollup happens here — two round
 * trips, however many categories exist.
 */
export async function getSubtreeProductCounts(): Promise<Map<string, number>> {
  const [tree, grouped] = await Promise.all([
    loadActiveTree(),
    prisma.product.groupBy({
      by: ['categoryId'],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);

  // groupBy emits no row at all for a category with no products, so a missing
  // entry means zero rather than "unknown".
  const direct = new Map(grouped.map((row) => [row.categoryId, row._count._all]));

  return new Map(
    tree.ids.map((id) => [
      id,
      collectSubtree(id, tree.childIds).reduce(
        (total, subtreeId) => total + (direct.get(subtreeId) ?? 0),
        0
      ),
    ])
  );
}

/**
 * A category id plus every active descendant id, for scoping a product
 * listing. Keeps the "N Products" on a category card and the products actually
 * listed under that category in agreement.
 */
export async function getCategoryScopeIds(rootId: string): Promise<string[]> {
  const { childIds } = await loadActiveTree();
  return collectSubtree(rootId, childIds);
}
