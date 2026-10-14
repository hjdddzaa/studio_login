import type { DefaultPrices } from './deployment.js';
import { ARK_SEED_FORMULA_BY_BILLING_ITEM, defaultTokenTierFormulaFor } from './ark-seed-pricing.js';

// Snapshot of the supplied LAS PriceInfo. StageId maps to Studio BillingItemId.
// OriginalPrice is the default customer price; DiscountPrice is the default internal cost.
// A price only applies when the billing unit matches the Studio catalog unit.
const STAGE_PRICES: Readonly<Record<string, readonly [unit: string, original: string, discount: string]>> = {
  'las_seedance-2.5_480p': ['second', '1.346', '1.346'],
  'las_seedance-2.5_720p': ['second', '3.024', '3.024'],
  'las_seedance-2.5_1080p': ['second', '7.484', '7.484'],
  'las_seedance-2.5_with-video_480p': ['second', '0.806', '0.806'],
  'las_seedance-2.5_with-video_720p': ['second', '1.814', '1.814'],
  'las_seedance-2.5_with-video_1080p': ['second', '4.472', '4.472'],
  'las_seedance-2.5_sr_720p': ['second', '1.3809', '1.3809'],
  'las_seedance-2.5_sr_with-video_720p': ['second', '1.8326', '1.8326'],
  'las_seedance-2.0_480p': ['second', '0.924', '0.924'],
  'las_seedance-2.0_720p': ['second', '1.988', '1.988'],
  'las_seedance-2.0_1080p': ['second', '4.958', '4.958'],
  'las_seedance-2.0_with-video_4k': ['second', '6.22', '6.22'],
  'las_seedance-2.0_4k': ['second', '10.108', '10.108'],
  'las_seedance-2.0_with-video_480p': ['second', '0.562', '0.562'],
  'las_seedance-2.0_with-video_720p': ['second', '1.208', '1.208'],
  'las_seedance-2.0_with-video_1080p': ['second', '3.014', '3.014'],
  'las_seedance-2.0-mini_480p': ['second', '0.462', '0.462'],
  'las_seedance-2.0-mini_720p': ['second', '0.994', '0.994'],
  'las_seedance-2.0-mini_with-video_480p': ['second', '0.282', '0.282'],
  'las_seedance-2.0-mini_with-video_720p': ['second', '0.605', '0.605'],
  'las_seedance-2.0-fast_480p': ['second', '0.744', '0.744'],
  'las_seedance-2.0-fast_720p': ['second', '1.598', '1.598'],
  'las_seedance-2.0-fast_with-video_480p': ['second', '0.442', '0.442'],
  'las_seedance-2.0-fast_with-video_720p': ['second', '0.95', '0.95'],
  'las_seedance-2.0_sr_720p': ['second', '0.9667', '0.9667'],
  'las_seedance-2.0_sr_1080p': ['second', '1.04', '1.04'],
  'las_seedance-2.0_sr_4k': ['second', '1.333', '1.333'],
  'las_seedance-2.0_sr_with-video_720p': ['second', '0.94835', '0.94835'],
  'las_seedance-2.0_sr_with-video_1080p': ['second', '0.985', '0.985'],
  'las_seedance-2.0_sr_with-video_4k': ['second', '1.1315', '1.1315'],
  'las_seedance-2.0-fast_sr_720p': ['second', '0.7807', '0.7807'],
  'las_seedance-2.0-fast_sr_with-video_720p': ['second', '0.76235', '0.76235'],
  'las_seedance-2.0-mini_sr_720p': ['second', '0.5017', '0.5017'],
  'las_seedance-2.0-mini_sr_with-video_720p': ['second', '0.48335', '0.48335'],
  'las_video_scene_seg': ['second', '0.025', '0.015'],
  'las_storyboard_rewrite': ['ou', '0.025', '0.015'],
  'las_video_seedance_replace-2.0_480p': ['second', '0.562', '0.562'],
  'las_video_seedance_replace-2.0_720p': ['second', '1.208', '1.208'],
  'las_video_seedance_replace-2.0_1080p': ['second', '3.014', '3.014'],
  'las_video_seedance_replace-2.0_4k': ['second', '6.22', '6.22'],
  'las_video_seedance_replace-2.0-mini_480p': ['second', '0.282', '0.282'],
  'las_video_seedance_replace-2.0-mini_720p': ['second', '0.605', '0.605'],
  'las_video_seedance_replace-2.0-fast_480p': ['second', '0.442', '0.442'],
  'las_video_seedance_replace-2.0-fast_720p': ['second', '0.95', '0.95'],
  'las_video_seedance_replace-2.5_480p': ['second', '0.806', '0.806'],
  'las_video_seedance_replace-2.5_720p': ['second', '1.814', '1.814'],
  'las_video_inpaint': ['second', '0.0467', '0.0467'],
  'las_video_merge_audio_rebuild': ['second', '0.06', '0.06'],
  'las_video_super_resolution_720p': ['second', '0.0367', '0.0367'],
  'las_video_super_resolution_1080p': ['second', '0.11', '0.11'],
  'las_video_super_resolution_4k': ['second', '0.403', '0.403'],
  'operator_unit': ['ou', '0.1', '0.1'],
  'las_video_edit_enhance-2.0_480p': ['second', '0.562', '0.562'],
  'las_video_edit_enhance-2.0_720p': ['second', '1.208', '1.208'],
  'las_video_edit_enhance-2.0_1080p': ['second', '3.014', '3.014'],
  'las_video_edit_enhance-2.0_4k': ['second', '6.22', '6.22'],
  'las_video_edit_enhance-2.0-fast_480p': ['second', '0.442', '0.442'],
  'las_video_edit_enhance-2.0-fast_720p': ['second', '0.95', '0.95'],
  'las_video_edit_enhance-2.0-mini_480p': ['second', '0.282', '0.282'],
  'las_video_edit_enhance-2.0-mini_720p': ['second', '0.605', '0.605'],
  'las_video_edit_enhance-2.5_480p': ['second', '0.806', '0.806'],
  'las_video_edit_enhance-2.5_720p': ['second', '1.814', '1.814'],
  'las_video_edit_enhance-2.5_1080p': ['second', '4.472', '4.472'],
  'las_video_edit_enhance-standard': ['second', '0.01', '0.01'],
  'las_video_edit_enhance-pro': ['second', '0.16', '0.16'],
  'las_video_interpolation': ['minute', '0.5', '0.5'],
  'las_video_translate': ['minute', '1.5', '1.5'],
  'las_video_translate_with_lip': ['minute', '5.5', '5.5'],
  'las_video_subtitle_translate_ocr_low': ['minute', '0.15', '0.15'],
  'las_video_subtitle_translate_ocr_high': ['minute', '0.25', '0.25'],
  'las_video_subtitle_translate_asr_low': ['minute', '0.015', '0.015'],
  'las_video_subtitle_translate_asr_high': ['minute', '1.5', '1.5'],
  'las_video_subtitle_translate_translation': ['minute', '0.1', '0.1'],
};

// USD list prices from the supplied LAS PriceInfo. Missing stages have no USD quote.
const USD_STAGE_PRICES: Readonly<Record<string, readonly [original: string, discount: string]>> = {
  'las_seedance-2.5_480p': ['0.2056', '0.2056'],
  'las_seedance-2.5_720p': ['0.462', '0.462'],
  'las_seedance-2.5_1080p': ['1.13724', '1.13724'],
  'las_seedance-2.5_with-video_1080p': ['0.6804', '0.6804'],
  'las_seedance-2.5_with-video_480p': ['0.123', '0.123'],
  'las_seedance-2.5_with-video_720p': ['0.2765', '0.2765'],
  'las_seedance-2.5_sr_720p': ['0.2156', '0.2156'],
  'las_seedance-2.0_480p': ['0.1413', '0.1413'],
  'las_seedance-2.0_720p': ['0.303', '0.303'],
  'las_seedance-2.0_1080p': ['0.7575', '0.7575'],
  'las_seedance-2.0_with-video_4k': ['0.95', '0.95'],
  'las_seedance-2.0_4k': ['1.538', '1.538'],
  'las_seedance-2.0_with-video_480p': ['0.0857', '0.0857'],
  'las_seedance-2.0_with-video_720p': ['0.1848', '0.1848'],
  'las_seedance-2.0_with-video_1080p': ['0.4621', '0.4621'],
  'las_seedance-2.0-mini_480p': ['0.07', '0.07'],
  'las_seedance-2.0-mini_720p': ['0.1515', '0.1515'],
  'las_seedance-2.0-mini_with-video_480p': ['0.04285', '0.04285'],
  'las_seedance-2.0-mini_with-video_720p': ['0.0924', '0.0924'],
  'las_seedance-2.0-fast_480p': ['0.1126', '0.1126'],
  'las_seedance-2.0-fast_720p': ['0.242', '0.242'],
  'las_seedance-2.0-fast_with-video_480p': ['0.067', '0.067'],
  'las_seedance-2.0-fast_with-video_720p': ['0.1449', '0.1449'],
  'las_seedance-2.0_sr_720p': ['0.1513', '0.1513'],
  'las_seedance-2.0_sr_1080p': ['0.1713', '0.1713'],
  'las_seedance-2.0_sr_4k': ['0.2513', '0.2513'],
  'las_seedance-2.0-fast_sr_720p': ['0.1226', '0.1226'],
  'las_seedance-2.0-mini_sr_720p': ['0.08', '0.08'],
  'las_video_scene_seg': ['0.0041', '0.0041'],
  'las_storyboard_rewrite': ['0.025', '0.015'],
  'las_video_super_resolution_720p': ['0.01', '0.01'],
  'las_video_super_resolution_1080p': ['0.03', '0.03'],
  'las_video_super_resolution_4k': ['0.11', '0.11'],
  'operator_unit': ['0.1', '0.1'],
  'las_video_translate': ['0.32', '0.32'],
  'las_video_translate_with_lip': ['0.68', '0.68'],
  'las_video_subtitle_translate_ocr_low': ['0.03', '0.03'],
  'las_video_subtitle_translate_ocr_high': ['0.06', '0.06'],
  'las_video_subtitle_translate_asr_low': ['0.006', '0.006'],
  'las_video_subtitle_translate_asr_high': ['0.23', '0.23'],
  'las_video_subtitle_translate_translation': ['0.02', '0.02'],
  'las_video_edit_enhance-2.0_480p': ['0.0857', '0.0857'],
  'las_video_edit_enhance-2.0_720p': ['0.1848', '0.1848'],
  'las_video_edit_enhance-2.0_1080p': ['0.4621', '0.4621'],
  'las_video_edit_enhance-2.0_4k': ['0.95', '0.95'],
  'las_video_edit_enhance-2.0-fast_480p': ['0.067', '0.067'],
  'las_video_edit_enhance-2.0-fast_720p': ['0.1449', '0.1449'],
  'las_video_edit_enhance-2.0-mini_480p': ['0.04285', '0.04285'],
  'las_video_edit_enhance-2.0-mini_720p': ['0.0924', '0.0924'],
  'las_video_edit_enhance-2.5_480p': ['0.123', '0.123'],
  'las_video_edit_enhance-2.5_720p': ['0.2765', '0.2765'],
  'las_video_edit_enhance-2.5_1080p': ['0.6804', '0.6804'],
  'las_video_edit_enhance-standard': ['0.001', '0.001'],
  'las_video_edit_enhance-pro': ['0.025', '0.025'],
};

// These Studio billing items use operator_unit as their LAS price lookup item.
const OPERATOR_UNIT_ITEMS = new Set([
  'las_hypervideo_script_planner',
  'las_image_edits_image-2',
  'las_image_generation_image-2',
  'las_storyboard_rewrite-2.0-lite',
  'las_storyboard_rewrite-2.0-pro',
  'las_storyboard_rewrite-2.1-pro',
  'las_storyboard_rewrite-2.1-turbo',
  'las_video_hypervideo',
  'las_video_inpaint_pro',
  'las_video_storyboard_gen-pro',
  'las_video_storyboard_gen-standard',
]);

// Ark output-image list prices. Pro uses its default 1.5K single-image tier;
// higher resolutions, layer splitting, and additional input images need
// request-aware pricing and cannot be represented by one image unit price.
const ARK_FIXED_PRICES: Readonly<Record<string, readonly [unit: string, price: string]>> = {
  'las_image_generation_seedream-4.5': ['image', '0.25'],
  'las_image_generation_seedream-5.0-lite': ['image', '0.22'],
  'las_image_generation_seedream-5.0-pro': ['image', '0.30'],
};

// BytePlus ModelArk standard output-image prices in USD per image.
// Seedream 5.0 Pro is the default single-image tier (at most 2.61M pixels).
const USD_ARK_FIXED_PRICES: Readonly<Record<string, string>> = {
  'las_image_generation_seedream-4.5': '0.04',
  'las_image_generation_seedream-5.0-lite': '0.035',
  'las_image_generation_seedream-5.0-pro': '0.045',
};

// These catalog items have no supplied LAS stage price. The Seed unit-price
// fallback is zero; currency-specific CSVs supply quoted token formulas.
const ZERO_PRICE_ITEMS: Readonly<Record<string, string>> = {
  'las_cdp_creative_recall': 'request',
  'las_llm_seed-2.0-lite': 'request',
  'las_llm_seed-2.0-mini': 'request',
  'las_llm_seed-2.0-pro': 'request',
  'las_llm_seed-2.1-pro': 'request',
  'las_llm_seed-2.1-turbo': 'request',
  'las_video_super_resolution_1440p': 'second',
};

const ZERO_PRICES: DefaultPrices = { customerUnitPrice: '0', costUnitPrice: '0' };

export interface BuiltinPriceItem {
  billingItemId: string;
  unit: string;
}

export const BUILTIN_PRICE_ITEMS: readonly BuiltinPriceItem[] = [
  ...Object.entries(STAGE_PRICES).map(([billingItemId, [unit]]) => ({ billingItemId, unit })),
  ...[...OPERATOR_UNIT_ITEMS].map(billingItemId => ({ billingItemId, unit: 'ou' })),
  ...Object.entries(ARK_FIXED_PRICES).map(([billingItemId, [unit]]) => ({ billingItemId, unit })),
  ...Object.entries(ZERO_PRICE_ITEMS).map(([billingItemId, unit]) => ({ billingItemId, unit })),
];

export function defaultPriceFor(
  billingItemId: string,
  unit: string,
  fallback: DefaultPrices,
  currency: 'CNY' | 'USD' = 'CNY',
): DefaultPrices {
  const arkFixed = ARK_FIXED_PRICES[billingItemId];
  if (arkFixed?.[0] === unit) {
    return currency === 'CNY'
      ? { customerUnitPrice: arkFixed[1], costUnitPrice: arkFixed[1] }
      : { customerUnitPrice: USD_ARK_FIXED_PRICES[billingItemId]!, costUnitPrice: USD_ARK_FIXED_PRICES[billingItemId]! };
  }
  if (ZERO_PRICE_ITEMS[billingItemId] === unit) return ZERO_PRICES;
  const key = OPERATOR_UNIT_ITEMS.has(billingItemId) && unit === 'ou'
    ? 'operator_unit'
    : billingItemId;
  const stage = STAGE_PRICES[key];
  if (stage?.[0] !== unit) return fallback;
  if (currency === 'USD') {
    const usdPrice = USD_STAGE_PRICES[key];
    return usdPrice
      ? { customerUnitPrice: usdPrice[0], costUnitPrice: usdPrice[1] }
      : ZERO_PRICES;
  }
  return { customerUnitPrice: stage[1], costUnitPrice: stage[2] };
}

export function defaultPriceFormulaFor(
  billingItemId: string,
  unit: string,
  currency: 'CNY' | 'USD' = 'CNY',
): string | null {
  return unit === 'request' && Object.hasOwn(ARK_SEED_FORMULA_BY_BILLING_ITEM, billingItemId)
    ? defaultTokenTierFormulaFor(billingItemId, currency)
    : null;
}
