import { describe, expect, it, vi } from 'vitest';

import { defaultTokenTierFormulaFor } from '../src/ark-seed-pricing.js';
import { baselineProjectId, BillingService, type BaselineCallbackInput } from '../src/billing.js';
import type { Database, DatabaseExecutor } from '../src/db.js';
import { AppError } from '../src/errors.js';
import type { AppLogger } from '../src/logging.js';

function databaseWithoutTasks(): Database {
  const executor: DatabaseExecutor = {
    query: async <T>() => [] as T[],
    execute: async () => ({ affectedRows: 0 }) as never,
  };
  return {
    ...executor,
    transaction: async work => work(executor),
    close: async () => undefined,
  };
}

function callback(status: BaselineCallbackInput['Status']): BaselineCallbackInput {
  return {
    RequestId: 'request-without-precheck',
    UserId: 'worker',
    Status: status,
    Items: [{
      BillingItemId: 'las_llm_seed-2.0-lite',
      Unit: 'request',
      Usage: 0,
    }],
  };
}

describe('BillingService callback', () => {
  it.each(['FAILED', 'CANCELLED'] as const)(
    'treats a missing task as idempotent for %s callbacks',
    async status => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } satisfies AppLogger;
      const service = new BillingService(databaseWithoutTasks(), logger);

      await expect(service.callback(
        'connection-1',
        'app-1',
        callback(status),
      )).resolves.toBeUndefined();

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'billing_actual_callback_ignored_without_precheck',
          requestId: 'request-without-precheck',
          status,
        }),
        expect.any(String),
      );
    },
  );

  it('still rejects a successful callback when precheck did not create a task', async () => {
    const service = new BillingService(databaseWithoutTasks());

    await expect(service.callback(
      'connection-1',
      'app-1',
      callback('SUCCEEDED'),
    )).rejects.toMatchObject({
      code: 'TASK_NOT_FOUND',
      statusCode: 404,
    } satisfies Partial<AppError>);
  });
});

describe('BillingService built-in pricing', () => {
  it('snapshots supplied LAS prices when no platform or group price exists', async () => {
    const writes: Array<{ sql: string; params: readonly unknown[] }> = [];
    const executor: DatabaseExecutor = {
      query: async <T>(sql: string) => {
        if (sql.includes('FROM users u')) return [{
          user_id: 'user-1', login_name: 'worker', account_id: 'account-1', status: 'ACTIVE',
          config_group_id: 'group-1', group_status: 'AVAILABLE', current_version: 1,
          project_id: 'project-1', monthly_limit: null, binding_monthly_limit: null,
          group_monthly_limit: null,
        }] as T[];
        return [] as T[];
      },
      execute: async (sql, params = []) => {
        writes.push({ sql, params });
        return { affectedRows: 1 } as never;
      },
    };
    const database: Database = {
      ...executor,
      transaction: async work => work(executor),
      close: async () => undefined,
    };

    await new BillingService(database).precheck('connection-1', 'app-1', {
      RequestId: 'price-snapshot', UserId: 'worker',
      Items: [
        { BillingItemId: 'las_video_scene_seg', Unit: 'second', Usage: 2 },
        { BillingItemId: 'las_llm_seed-2.1-turbo', Unit: 'request', Usage: 1,
          BillingContext: JSON.stringify({
            prompt_tokens: 1_000,
            completion_tokens: 200,
            prompt_tokens_details: { cached_tokens: 100 },
          }),
        },
      ],
    });

    const task = writes.find(write => write.sql.includes('INSERT INTO studio_tasks'));
    const items = writes.filter(write => write.sql.includes('INSERT INTO studio_task_items'));
    expect(task?.params.slice(-2)).toEqual(['0.055760', '0.035760']);
    expect(items[0]?.params.slice(6, 9)).toEqual(['0.0250000000', null, '0.0150000000']);
    expect(items[1]?.params.slice(6, 9)).toEqual([
      '0.0000000000', defaultTokenTierFormulaFor('las_llm_seed-2.1-turbo'), '0.0000000000',
    ]);
  });
});

describe('baselineProjectId', () => {
  it('prefers BillingContext extensions project id over the legacy top-level field', () => {
    expect(baselineProjectId({
      ProjectId: 'top-level-project',
      Items: [{
        BillingItemId: 'las_llm_seed-2.0-lite',
        Unit: 'request',
        Usage: 1,
        BillingContext: JSON.stringify({
          extensions: {
            project_id: 'extension-project',
          },
        }),
      }],
    })).toBe('extension-project');
  });

  it('keeps legacy top-level ProjectId as a fallback', () => {
    expect(baselineProjectId({
      ProjectId: 'top-level-project',
      Items: [{
        BillingItemId: 'las_llm_seed-2.0-lite',
        Unit: 'request',
        Usage: 1,
      }],
    })).toBe('top-level-project');
  });

  it('rejects inconsistent project ids across item BillingContext extensions', () => {
    expect(() => baselineProjectId({
      Items: [
        {
          BillingItemId: 'las_llm_seed-2.0-lite',
          Unit: 'request',
          Usage: 1,
          BillingContext: '{"extensions":{"project_id":"project-a"}}',
        },
        {
          BillingItemId: 'las_llm_seed-2.0-pro',
          Unit: 'request',
          Usage: 1,
          BillingContext: '{"extensions":{"project_id":"project-b"}}',
        },
      ],
    })).toThrow('BillingContext.extensions.project_id 不一致');
  });
});
