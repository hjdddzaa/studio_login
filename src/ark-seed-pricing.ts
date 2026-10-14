import { Decimal } from 'decimal.js';
import { z } from 'zod';

import { AppError } from './errors.js';
import { message } from './i18n.js';

interface SeedRate {
  maxInputTokens: number;
  input: string;
  audioInput?: string;
  cached: string;
  cachedAudio?: string;
  output: string;
}

const price = z.string().regex(/^\d+(?:\.\d{1,10})?$/);
const tierSchema = z.object({
  maxInputTokens: z.number().int().positive().max(10_000_000),
  input: price,
  audioInput: price.optional(),
  cached: price,
  cachedAudio: price.optional(),
  output: price,
}).strict();
const ruleSchema = z.object({
  version: z.literal(1),
  basis: z.literal('prompt_tokens'),
  tiers: z.array(tierSchema).min(1).max(10),
}).strict();

export type TokenTierRule = z.infer<typeof ruleSchema>;
export const TOKEN_TIER_PREFIX = 'token_tier:';

export const ARK_SEED_FORMULA_BY_BILLING_ITEM: Readonly<Record<string, string>> = {
  'las_llm_seed-2.0-lite': 'ark_seed_2_0_lite',
  'las_llm_seed-2.0-mini': 'ark_seed_2_0_mini',
  'las_llm_seed-2.0-pro': 'ark_seed_2_0_pro',
  'las_llm_seed-2.1-pro': 'ark_seed_2_1_pro',
  'las_llm_seed-2.1-turbo': 'ark_seed_2_1_turbo',
};

// Ark online standard list prices in CNY per million tokens, 2026-10-13.
// https://docs.volcengine.com/docs/ark/model-pricing?lang=zh
const RATES: Readonly<Record<string, readonly SeedRate[]>> = {
  ark_seed_2_0_lite: [
    { maxInputTokens: 32_000, input: '0.6', audioInput: '9', cached: '0.12', cachedAudio: '1.8', output: '3.6' },
    { maxInputTokens: 128_000, input: '0.9', audioInput: '13.5', cached: '0.18', cachedAudio: '2.7', output: '5.4' },
    { maxInputTokens: 256_000, input: '1.8', audioInput: '27', cached: '0.36', cachedAudio: '5.4', output: '10.8' },
  ],
  ark_seed_2_0_mini: [
    { maxInputTokens: 32_000, input: '0.2', audioInput: '3', cached: '0.04', cachedAudio: '0.6', output: '2' },
    { maxInputTokens: 128_000, input: '0.4', audioInput: '6', cached: '0.08', cachedAudio: '1.2', output: '4' },
    { maxInputTokens: 256_000, input: '0.8', audioInput: '12', cached: '0.16', cachedAudio: '2.4', output: '8' },
  ],
  ark_seed_2_0_pro: [
    { maxInputTokens: 32_000, input: '3.2', cached: '0.64', output: '16' },
    { maxInputTokens: 128_000, input: '4.8', cached: '0.96', output: '24' },
    { maxInputTokens: 256_000, input: '9.6', cached: '1.92', output: '48' },
  ],
  ark_seed_2_1_pro: [
    { maxInputTokens: 1_024_000, input: '6', cached: '1.2', output: '30' },
  ],
  ark_seed_2_1_turbo: [
    { maxInputTokens: 256_000, input: '3', cached: '0.6', output: '15' },
  ],
};

// BytePlus ModelArk standard online list prices in USD per million tokens.
// https://docs.byteplus.com/en/docs/modelark/model-pricing
// The BytePlus list does not publish a Seed 2.1 Pro USD price.
const USD_RATES: Readonly<Record<string, readonly SeedRate[]>> = {
  ark_seed_2_0_lite: [
    { maxInputTokens: 128_000, input: '0.25', audioInput: '3.75', cached: '0.05', cachedAudio: '0.75', output: '2' },
    { maxInputTokens: 256_000, input: '0.5', audioInput: '7.5', cached: '0.1', cachedAudio: '1.5', output: '4' },
  ],
  ark_seed_2_0_mini: [
    { maxInputTokens: 128_000, input: '0.1', audioInput: '1.5', cached: '0.02', cachedAudio: '0.3', output: '0.4' },
    { maxInputTokens: 256_000, input: '0.2', audioInput: '3', cached: '0.04', cachedAudio: '0.6', output: '0.8' },
  ],
  ark_seed_2_0_pro: [
    { maxInputTokens: 128_000, input: '0.5', cached: '0.1', output: '3' },
    { maxInputTokens: 256_000, input: '1', cached: '0.2', output: '6' },
  ],
  ark_seed_2_1_turbo: [
    { maxInputTokens: 256_000, input: '0.5', cached: '0.1', output: '2.5' },
  ],
};

export function isTokenTierPriceFormula(formula: string): boolean {
  return formula.startsWith(TOKEN_TIER_PREFIX);
}

export function parseTokenTierRule(formula: string): TokenTierRule {
  if (!isTokenTierPriceFormula(formula)) {
    throw new AppError(message('pricing.tokenTierInvalid'), 400, 'INVALID_TOKEN_TIER_RULE');
  }
  try {
    const parsed = ruleSchema.parse(JSON.parse(formula.slice(TOKEN_TIER_PREFIX.length)));
    for (let index = 0; index < parsed.tiers.length; index += 1) {
      const tier = parsed.tiers[index]!;
      if (index > 0 && tier.maxInputTokens <= parsed.tiers[index - 1]!.maxInputTokens) {
        throw new Error('tiers must be ascending');
      }
      if (Boolean(tier.audioInput) !== Boolean(tier.cachedAudio)) {
        throw new Error('audio prices must be paired');
      }
    }
    return parsed;
  } catch {
    throw new AppError(message('pricing.tokenTierInvalid'), 400, 'INVALID_TOKEN_TIER_RULE');
  }
}

export function serializeTokenTierRule(rule: TokenTierRule): string {
  return TOKEN_TIER_PREFIX + JSON.stringify(ruleSchema.parse(rule));
}

export function defaultTokenTierFormulaFor(billingItemId: string, currency: 'CNY' | 'USD' = 'CNY'): string | null {
  const alias = ARK_SEED_FORMULA_BY_BILLING_ITEM[billingItemId];
  const tiers = alias ? (currency === 'USD' ? USD_RATES[alias] : RATES[alias]) : undefined;
  return tiers ? serializeTokenTierRule({ version: 1, basis: 'prompt_tokens', tiers: [...tiers] }) : null;
}

export function validateTokenTierForBillingItem(formula: string, billingItemId: string): void {
  const alias = ARK_SEED_FORMULA_BY_BILLING_ITEM[billingItemId];
  const requiredCoverage = alias ? RATES[alias]?.at(-1)?.maxInputTokens : undefined;
  if (!requiredCoverage) {
    throw new AppError(message('pricing.tokenTierUnsupported'), 400, 'PRICE_FORMULA_UNSUPPORTED_BILLING_ITEM');
  }
  const audioSupported = billingItemId === 'las_llm_seed-2.0-lite'
    || billingItemId === 'las_llm_seed-2.0-mini';
  const tiers = parseTokenTierRule(formula).tiers;
  if (tiers[tiers.length - 1]!.maxInputTokens < requiredCoverage) {
    throw new AppError(message('pricing.tokenTierInvalid'), 400, 'INVALID_TOKEN_TIER_RULE');
  }
  for (const tier of tiers) {
    if (Boolean(tier.audioInput) !== audioSupported) {
      throw new AppError(message('pricing.tokenTierInvalid'), 400, 'INVALID_TOKEN_TIER_RULE');
    }
  }
}

export function isArkSeedPriceFormula(formula: string): boolean {
  return Object.hasOwn(RATES, formula);
}

function invalidUsage(): never {
  throw new AppError(message('pricing.billingContextInvalid'), 400, 'ARK_SEED_USAGE_INVALID');
}

function tokenCount(value: unknown, required = false): Decimal {
  if (value === null || value === undefined) {
    if (required) invalidUsage();
    return new Decimal(0);
  }
  if (typeof value !== 'string' && typeof value !== 'number') invalidUsage();
  try {
    const tokens = new Decimal(value);
    if (!tokens.isFinite() || !tokens.isInteger() || tokens.isNegative()) invalidUsage();
    return tokens;
  } catch {
    return invalidUsage();
  }
}

function details(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) invalidUsage();
  return value as Record<string, unknown>;
}

export function evaluateArkSeedPrice(formula: string, context: Record<string, unknown>): Decimal {
  const rates = RATES[formula];
  if (!rates) invalidUsage();
  return evaluateTokenRates(rates, context);
}

export function evaluateTokenTierPrice(formula: string, context: Record<string, unknown>): Decimal {
  return evaluateTokenRates(parseTokenTierRule(formula).tiers, context);
}

function evaluateTokenRates(rates: readonly SeedRate[], context: Record<string, unknown>): Decimal {
  const prompt = tokenCount(context.prompt_tokens, true);
  const completion = tokenCount(context.completion_tokens, true);
  const promptDetails = details(context.prompt_tokens_details);
  const cached = tokenCount(promptDetails.cached_tokens);
  const audio = tokenCount(promptDetails.audio_tokens);
  const cachedAudio = tokenCount(promptDetails.audio_cached_tokens);
  if (audio.gt(0) && cached.gt(0) && promptDetails.audio_cached_tokens == null) invalidUsage();
  if (cached.gt(prompt) || audio.gt(prompt) || cachedAudio.gt(cached) || cachedAudio.gt(audio)
    || prompt.minus(audio).lt(cached.minus(cachedAudio))) invalidUsage();

  const rate = rates.find(item => prompt.lte(item.maxInputTokens));
  if (!rate || (audio.gt(0) && !rate.audioInput)) invalidUsage();
  const uncachedAudio = audio.minus(cachedAudio);
  const uncachedText = prompt.minus(audio).minus(cached.minus(cachedAudio));
  const cachedText = cached.minus(cachedAudio);
  return uncachedText.mul(rate.input)
    .plus(uncachedAudio.mul(rate.audioInput ?? '0'))
    .plus(cachedText.mul(rate.cached))
    .plus(cachedAudio.mul(rate.cachedAudio ?? '0'))
    .plus(completion.mul(rate.output))
    .div(1_000_000);
}
