import { describe, expect, it } from 'vitest';

import { evaluatePriceFormula, validatePriceFormula } from '../src/price-formula.js';
import { defaultTokenTierFormulaFor, parseTokenTierRule, serializeTokenTierRule, validateTokenTierForBillingItem } from '../src/ark-seed-pricing.js';

describe('Ark Seed online standard pricing formulas', () => {
  it('prices text, audio, cached input and output tokens', () => {
    expect(validatePriceFormula('ark_seed_2_0_lite')).toBe('ark_seed_2_0_lite');
    expect(evaluatePriceFormula('ark_seed_2_0_lite', {
      prompt_tokens: 20_000,
      completion_tokens: 1_000,
      prompt_tokens_details: {
        audio_tokens: 4_000,
        cached_tokens: 3_000,
        audio_cached_tokens: 500,
      },
    }).toFixed(6)).toBe('0.044400');
  });

  it('uses the whole-request price tier selected by input length', () => {
    expect(evaluatePriceFormula('ark_seed_2_0_pro', {
      prompt_tokens: 200_000,
      completion_tokens: 14_000,
      prompt_tokens_details: { cached_tokens: 50_000 },
    }).toFixed(6)).toBe('2.208000');
    expect(evaluatePriceFormula('ark_seed_2_0_mini', {
      prompt_tokens: 32_001,
      completion_tokens: 1_000,
    }).toFixed(6)).toBe('0.016800');
  });

  it('uses the one-tier rates for Seed 2.1 models', () => {
    const context = {
      prompt_tokens: 1_000,
      completion_tokens: 200,
      prompt_tokens_details: { cached_tokens: 100 },
    };
    expect(evaluatePriceFormula('ark_seed_2_1_pro', context).toFixed(6)).toBe('0.011520');
    expect(evaluatePriceFormula('ark_seed_2_1_turbo', context).toFixed(6)).toBe('0.005760');
  });

  it('uses BytePlus USD tiers without converting CNY prices', () => {
    const lite = defaultTokenTierFormulaFor('las_llm_seed-2.0-lite', 'USD')!;
    expect(evaluatePriceFormula(lite, {
      prompt_tokens: 200_000,
      completion_tokens: 1_000,
      prompt_tokens_details: { audio_tokens: 10_000, cached_tokens: 5_000, audio_cached_tokens: 1_000 },
    }).toFixed(6)).toBe('0.166400');
    const turbo = defaultTokenTierFormulaFor('las_llm_seed-2.1-turbo', 'USD')!;
    expect(evaluatePriceFormula(turbo, {
      prompt_tokens: 1_000,
      completion_tokens: 200,
      prompt_tokens_details: { cached_tokens: 0 },
    }).toFixed(6)).toBe('0.001000');
    expect(defaultTokenTierFormulaFor('las_llm_seed-2.1-pro', 'USD')).toBeNull();
  });

  it('rejects inconsistent token detail instead of silently undercharging', () => {
    expect(() => evaluatePriceFormula('ark_seed_2_0_lite', {
      prompt_tokens: 100,
      completion_tokens: 20,
      prompt_tokens_details: { cached_tokens: 101 },
    })).toThrowError(expect.objectContaining({ code: 'ARK_SEED_USAGE_INVALID' }));
    expect(() => evaluatePriceFormula('ark_seed_2_0_pro', {
      prompt_tokens: 256_001,
      completion_tokens: 20,
    })).toThrowError(expect.objectContaining({ code: 'ARK_SEED_USAGE_INVALID' }));
    expect(() => evaluatePriceFormula('ark_seed_2_1_pro', {
      completion_tokens: 20,
    })).toThrowError(expect.objectContaining({ code: 'ARK_SEED_USAGE_INVALID' }));
  });

  it('lets an administrator edit tier rates without changing the price engine', () => {
    const original = defaultTokenTierFormulaFor('las_llm_seed-2.0-lite')!;
    const rule = parseTokenTierRule(original);
    rule.tiers[1]!.input = '1.25';
    const edited = serializeTokenTierRule(rule);
    expect(validatePriceFormula(edited)).toBe(edited);
    const context = { prompt_tokens: 32_001, completion_tokens: 1_000, prompt_tokens_details: { cached_tokens: 0 } };
    expect(evaluatePriceFormula(edited, context).minus(evaluatePriceFormula(original, context)).toFixed(6))
      .toBe('0.011200');
  });

  it('rejects gaps in usage details and malformed tier boundaries', () => {
    const formula = defaultTokenTierFormulaFor('las_llm_seed-2.0-mini')!;
    expect(() => evaluatePriceFormula(formula, {
      prompt_tokens: 20_000,
      completion_tokens: 100,
      prompt_tokens_details: { audio_tokens: 2_000, cached_tokens: 1_000 },
    })).toThrowError(expect.objectContaining({ code: 'ARK_SEED_USAGE_INVALID' }));
    const rule = parseTokenTierRule(formula);
    rule.tiers[1]!.maxInputTokens = rule.tiers[0]!.maxInputTokens;
    expect(() => validatePriceFormula('token_tier:' + JSON.stringify(rule)))
      .toThrowError(expect.objectContaining({ code: 'INVALID_TOKEN_TIER_RULE' }));
    rule.tiers = [rule.tiers[0]!];
    expect(() => validateTokenTierForBillingItem(serializeTokenTierRule(rule), 'las_llm_seed-2.0-mini'))
      .toThrowError(expect.objectContaining({ code: 'INVALID_TOKEN_TIER_RULE' }));
  });
});
