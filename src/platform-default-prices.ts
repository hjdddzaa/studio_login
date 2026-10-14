import { ARK_SEED_FORMULA_BY_BILLING_ITEM, defaultTokenTierFormulaFor } from './ark-seed-pricing.js';
import type { AppConfig } from './config.js';
import type { Database } from './db.js';

// Previous platform Seed defaults were saved as enabled 0/0 unit prices. Upgrade
// only those exact rows; other platform and config-group prices are admin choices.
export async function upgradeLegacySeedPlatformPrices(
  database: Database,
  currency: AppConfig['STUDIO_LOGIN_CURRENCY'],
): Promise<number> {
  let updated = 0;
  await database.transaction(async tx => {
    for (const [billingItemId, legacyFormula] of Object.entries(ARK_SEED_FORMULA_BY_BILLING_ITEM)) {
      const formula = defaultTokenTierFormulaFor(billingItemId, currency);
      if (!formula) continue;
      const result = await tx.execute(
        `UPDATE operator_prices
            SET customer_price_formula = ?, cost_price_formula = ?
          WHERE scope_type = 'PLATFORM' AND scope_id = '*'
            AND billing_item_id = ? AND unit = 'request'
            AND enabled = TRUE
            AND customer_unit_price = 0 AND cost_unit_price = 0
            AND customer_price_formula IS NULL AND cost_price_formula IS NULL`,
        [formula, formula, billingItemId],
      );
      updated += result.affectedRows;
      for (const column of ['customer_price_formula', 'cost_price_formula'] as const) {
        const migrated = await tx.execute(
          `UPDATE operator_prices SET ${column} = ?
            WHERE billing_item_id = ? AND unit = 'request' AND ${column} = ?`,
          [formula, billingItemId, legacyFormula],
        );
        updated += migrated.affectedRows;
      }
    }
  });
  return updated;
}
