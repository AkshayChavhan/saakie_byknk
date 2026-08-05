import 'server-only';
import prisma from '@/lib/prisma';

/**
 * Store-wide settings, held in a single `store_settings` row. Reads never throw
 * on a missing row: `DEFAULT_STORE_SETTINGS` is returned instead, so a database
 * that has never had the row written behaves exactly as it did before this
 * feature existed (COD allowed, gated only by per-product `paymentModes`).
 */

/** The singleton row's `key`. */
export const STORE_SETTING_KEY = 'store';

export interface StoreSettings {
  /** Store-wide Cash on Delivery switch. */
  codEnabled: boolean;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  codEnabled: true,
};

/** Read the store settings, falling back to the defaults when unset. */
export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSetting.findUnique({
    where: { key: STORE_SETTING_KEY },
    select: { codEnabled: true },
  });

  return { codEnabled: row?.codEnabled ?? DEFAULT_STORE_SETTINGS.codEnabled };
}

/**
 * Write the store settings, creating the singleton row on first save.
 * `updatedById` records which admin flipped the switch.
 */
export async function updateStoreSettings(
  patch: Partial<StoreSettings>,
  updatedById?: string
): Promise<StoreSettings> {
  const row = await prisma.storeSetting.upsert({
    where: { key: STORE_SETTING_KEY },
    update: { ...patch, updatedById: updatedById ?? null },
    create: { ...DEFAULT_STORE_SETTINGS, ...patch, key: STORE_SETTING_KEY, updatedById: updatedById ?? null },
    select: { codEnabled: true },
  });

  return { codEnabled: row.codEnabled };
}
