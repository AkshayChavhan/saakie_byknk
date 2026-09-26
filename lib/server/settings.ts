import 'server-only'
import prisma from '@/lib/prisma'
import { DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from '@/lib/shipping'

/** The `key` of the one document in `store_settings`. */
export const SETTINGS_KEY = 'default'

export interface StoreSettings extends ShippingSettings {
  /** ISO timestamp of the last admin save; null until the first one. */
  updatedAt: string | null
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  ...DEFAULT_SHIPPING_SETTINGS,
  updatedAt: null,
}

/** Fields an admin may change. */
export type StoreSettingsPatch = Partial<Pick<StoreSettings, 'shippingEnabled'>>

type Row = { shippingEnabled: boolean; updatedAt: Date }

const fromRow = (row: Row): StoreSettings => ({
  shippingEnabled: row.shippingEnabled,
  updatedAt: row.updatedAt.toISOString(),
})

/**
 * Current store settings. Falls back to the defaults until an admin has
 * saved something, so a fresh database behaves exactly as the hard-coded
 * rules did before the settings existed.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSettings.findUnique({ where: { key: SETTINGS_KEY } })
  return row ? fromRow(row) : DEFAULT_STORE_SETTINGS
}

/** Apply an admin change, creating the document on the first save. */
export async function updateStoreSettings(patch: StoreSettingsPatch): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, ...patch },
    update: patch,
  })
  return fromRow(row)
}
