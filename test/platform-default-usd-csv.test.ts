import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseCsvRecords } from '../src/csv-import.js';
import { BUILTIN_PRICE_ITEMS, defaultPriceFor, defaultPriceFormulaFor } from '../src/default-price-catalog.js';
import { evaluatePriceFormula } from '../src/price-formula.js';

const csv = readFileSync(new URL('../prices/platform-default-usd.csv', import.meta.url), 'utf8');
const fallback = { customerUnitPrice: '1', costUnitPrice: '0.5' };

describe('USD platform default price CSV', () => {
  it('covers every built-in item and matches runtime USD defaults', () => {
    const rows = parseCsvRecords(csv);
    expect(rows).toHaveLength(94);
    expect(new Set(rows.map(row => `${row.billingItemId}\0${row.unit}`)))
      .toEqual(new Set(BUILTIN_PRICE_ITEMS.map(item => `${item.billingItemId}\0${item.unit}`)));
    for (const row of rows) {
      const price = defaultPriceFor(row.billingItemId!, row.unit!, fallback, 'USD');
      const formula = defaultPriceFormulaFor(row.billingItemId!, row.unit!, 'USD');
      expect(row).toMatchObject({
        customerPricingMode: formula ? 'TOKEN_TIER' : 'UNIT',
        customerUnitPrice: price.customerUnitPrice,
        customerPriceFormula: formula ?? '',
        costPricingMode: formula ? 'TOKEN_TIER' : 'UNIT',
        costUnitPrice: price.costUnitPrice,
        costPriceFormula: formula ?? '',
      });
    }
  });

  it('uses BytePlus token rates for four quoted models and leaves unquoted Pro 2.1 unset', () => {
    const rows = parseCsvRecords(csv);
    expect(rows.filter(row => row.customerPricingMode === 'TOKEN_TIER')).toHaveLength(4);
    const lite = rows.find(row => row.billingItemId === 'las_llm_seed-2.0-lite')!;
    expect(evaluatePriceFormula(lite.customerPriceFormula!, {
      prompt_tokens: 128_001,
      completion_tokens: 1_000,
      prompt_tokens_details: { cached_tokens: 0 },
    }).toFixed(6)).toBe('0.068001');
    expect(rows.find(row => row.billingItemId === 'las_llm_seed-2.1-pro')).toMatchObject({
      customerPricingMode: 'UNIT', customerUnitPrice: '0', customerPriceFormula: '',
      costPricingMode: 'UNIT', costUnitPrice: '0', costPriceFormula: '',
    });
  });
});
