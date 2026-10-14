import { describe, expect, it } from 'vitest';

import type { Database } from '../src/db.js';
import { upgradeLegacySeedPlatformPrices } from '../src/platform-default-prices.js';

describe('legacy platform Seed price upgrade', () => {
  it('upgrades only quoted USD Seed models and leaves Seed 2.1 Pro without an invented rate', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
        execute: async (sql: string, params: unknown[]) => {
          calls.push({ sql, params });
          return { affectedRows: 1 };
        },
      }),
    } as unknown as Database;

    expect(await upgradeLegacySeedPlatformPrices(database, 'USD')).toBe(12);
    expect(calls).toHaveLength(12);
    expect(calls.some(call => call.params.includes('las_llm_seed-2.1-pro'))).toBe(false);
    const lite = calls.find(call => call.params.includes('las_llm_seed-2.0-lite'))!;
    expect(lite.sql).toContain('customer_unit_price = 0 AND cost_unit_price = 0');
    expect(lite.params[0]).toContain('"input":"0.25"');
  });
});
