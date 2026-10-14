import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ARK_SEED_FORMULA_BY_BILLING_ITEM, defaultTokenTierFormulaFor } from '../src/ark-seed-pricing.js';
import { parseCsvRecords } from '../src/csv-import.js';
import { supportsBillingContextPriceFormula } from '../src/custom-billing-items.js';
import { BUILTIN_PRICE_ITEMS } from '../src/default-price-catalog.js';
import { evaluatePriceFormula } from '../src/price-formula.js';

const csv = readFileSync(new URL('../prices/platform-default-cny.csv', import.meta.url), 'utf8');

describe('complete platform default price CSV', () => {
  it('has one importable row for every built-in billing item', () => {
    const rows = parseCsvRecords(csv);
    expect(rows).toHaveLength(94);
    const keys = new Set(rows.map(row => `${row.billingItemId}\0${row.unit}`));
    expect(keys.size).toBe(rows.length);
    expect(keys).toEqual(new Set(BUILTIN_PRICE_ITEMS.map(item => `${item.billingItemId}\0${item.unit}`)));
    for (const row of rows) {
      expect(row.customerUnitPrice).not.toBe('');
      expect(row.costUnitPrice).not.toBe('');
      expect(['UNIT', 'FORMULA', 'TOKEN_TIER']).toContain(row.customerPricingMode);
      expect(['UNIT', 'FORMULA', 'TOKEN_TIER']).toContain(row.costPricingMode);
    }
  });

  it('uses token formulas for all five Seed models', () => {
    const rows = parseCsvRecords(csv);
    for (const billingItemId of Object.keys(ARK_SEED_FORMULA_BY_BILLING_ITEM)) {
      const formula = defaultTokenTierFormulaFor(billingItemId)!;
      const row = rows.find(item => item.billingItemId === billingItemId);
      expect(row).toMatchObject({
        unit: 'request',
        customerPricingMode: 'TOKEN_TIER',
        customerPriceFormula: formula,
        costPricingMode: 'TOKEN_TIER',
        costPriceFormula: formula,
      });
      expect(evaluatePriceFormula(formula, {
        prompt_tokens: 1_000,
        completion_tokens: 200,
        prompt_tokens_details: { cached_tokens: 0 },
      }).gt(0)).toBe(true);
      expect(supportsBillingContextPriceFormula(billingItemId, 'request', [], [])).toBe(true);
    }
  });
});
