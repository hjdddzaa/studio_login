import { describe, expect, it } from 'vitest';

import { BUILTIN_PRICE_ITEMS, defaultPriceFor, defaultPriceFormulaFor } from '../src/default-price-catalog.js';

const fallback = { customerUnitPrice: '1', costUnitPrice: '0.5' };

describe('built-in LAS prices', () => {
  it('covers every supplied stage and the additional platform pricing keys', () => {
    const keys = BUILTIN_PRICE_ITEMS.map(item => `${item.billingItemId}\0${item.unit}`);
    expect(keys).toHaveLength(94);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of [
      'operator_unit\0ou',
      'las_storyboard_rewrite\0ou',
      'las_video_edit_enhance-standard\0second',
      'las_video_edit_enhance-pro\0second',
      'las_video_subtitle_translate_translation\0minute',
      'las_image_generation_seedream-5.0-pro\0image',
    ]) expect(keys).toContain(key);
  });

  it('uses original and discounted prices for a supplied stage', () => {
    expect(defaultPriceFor('las_video_scene_seg', 'second', fallback)).toEqual({
      customerUnitPrice: '0.025',
      costUnitPrice: '0.015',
    });
    expect(defaultPriceFor('las_seedance-2.5_sr_with-video_720p', 'second', fallback)).toEqual({
      customerUnitPrice: '1.8326',
      costUnitPrice: '1.8326',
    });
  });

  it('applies the operator_unit price to OU items that look it up', () => {
    expect(defaultPriceFor('las_storyboard_rewrite-2.1-pro', 'ou', fallback)).toEqual({
      customerUnitPrice: '0.1',
      costUnitPrice: '0.1',
    });
    expect(defaultPriceFor('las_image_generation_image-2', 'ou', fallback)).toEqual({
      customerUnitPrice: '0.1',
      costUnitPrice: '0.1',
    });
  });

  it('uses Ark output-image list prices for Seedream defaults', () => {
    expect(defaultPriceFor('las_image_generation_seedream-4.5', 'image', fallback)).toEqual({
      customerUnitPrice: '0.25',
      costUnitPrice: '0.25',
    });
    expect(defaultPriceFor('las_image_generation_seedream-5.0-lite', 'image', fallback)).toEqual({
      customerUnitPrice: '0.22',
      costUnitPrice: '0.22',
    });
    expect(defaultPriceFor('las_image_generation_seedream-5.0-pro', 'image', fallback)).toEqual({
      customerUnitPrice: '0.30',
      costUnitPrice: '0.30',
    });
    expect(defaultPriceFor('las_image_generation_seedream-4.5', 'image', fallback, 'USD')).toEqual({
      customerUnitPrice: '0.04',
      costUnitPrice: '0.04',
    });
    expect(defaultPriceFor('las_image_generation_seedream-5.0-lite', 'image', fallback, 'USD')).toEqual({
      customerUnitPrice: '0.035',
      costUnitPrice: '0.035',
    });
    expect(defaultPriceFor('las_image_generation_seedream-5.0-pro', 'image', fallback, 'USD')).toEqual({
      customerUnitPrice: '0.045',
      costUnitPrice: '0.045',
    });
  });

  it('uses supplied USD stage prices and zero for stages without a USD quote', () => {
    expect(defaultPriceFor('las_seedance-2.5_720p', 'second', fallback, 'USD')).toEqual({
      customerUnitPrice: '0.462', costUnitPrice: '0.462',
    });
    expect(defaultPriceFor('las_video_scene_seg', 'second', fallback, 'USD')).toEqual({
      customerUnitPrice: '0.0041', costUnitPrice: '0.0041',
    });
    expect(defaultPriceFor('las_storyboard_rewrite', 'ou', fallback, 'USD')).toEqual({
      customerUnitPrice: '0.025', costUnitPrice: '0.015',
    });
    expect(defaultPriceFor('las_video_inpaint', 'second', fallback, 'USD')).toEqual({
      customerUnitPrice: '0', costUnitPrice: '0',
    });
  });

  it('uses explicit zero prices for catalog items without a representable list price', () => {
    for (const [billingItemId, unit] of [
      ['las_cdp_creative_recall', 'request'],
      ['las_llm_seed-2.0-lite', 'request'],
      ['las_llm_seed-2.0-mini', 'request'],
      ['las_llm_seed-2.0-pro', 'request'],
      ['las_llm_seed-2.1-pro', 'request'],
      ['las_llm_seed-2.1-turbo', 'request'],
      ['las_video_super_resolution_1440p', 'second'],
    ] as const) {
      expect(defaultPriceFor(billingItemId, unit, fallback)).toEqual({
        customerUnitPrice: '0',
        costUnitPrice: '0',
      });
    }
  });

  it('keeps the deployment fallback for unknown items and mismatched units', () => {
    expect(defaultPriceFor('unknown_item', 'request', fallback)).toBe(fallback);
    expect(defaultPriceFor('las_seedance-2.5_720p', 'minute', fallback)).toBe(fallback);
    expect(defaultPriceFor('las_image_generation_image-2', 'image', fallback)).toBe(fallback);
    expect(defaultPriceFor('las_video_super_resolution_1440p', 'minute', fallback)).toBe(fallback);
  });

  it('uses currency-specific token formulas as Seed defaults', () => {
    expect(defaultPriceFormulaFor('las_llm_seed-2.0-lite', 'request'))
      .toContain('token_tier:');
    expect(defaultPriceFormulaFor('las_llm_seed-2.1-turbo', 'request'))
      .toContain('token_tier:');
    expect(defaultPriceFormulaFor('las_llm_seed-2.0-lite', 'request', 'USD'))
      .toContain('"input":"0.25"');
    expect(defaultPriceFormulaFor('las_llm_seed-2.1-turbo', 'request', 'USD'))
      .toContain('"output":"2.5"');
    expect(defaultPriceFormulaFor('las_llm_seed-2.1-pro', 'request', 'USD')).toBeNull();
    expect(defaultPriceFormulaFor('las_llm_seed-2.0-lite', 'token')).toBeNull();
  });
});
