import { DEFAULT_FEATURE_CONFIG, FEATURE_ORDER } from "@/constants/features";
import { FeatureId, FeatureConfig, HouseSettings } from "@/types/database";

/**
 * Get merged feature config for a house (defaults + house overrides)
 * Ensures backward compatibility: missing config = all features enabled with defaults
 */
export function getFeatureConfig(
  settings: HouseSettings | null | undefined,
  featureId: FeatureId
): FeatureConfig {
  const defaults = DEFAULT_FEATURE_CONFIG[featureId];
  const overrides = settings?.features?.[featureId];
  return { ...defaults, ...overrides };
}

/**
 * Get all enabled features in display order
 */
export function getEnabledFeatures(
  settings: HouseSettings | null | undefined
): FeatureId[] {
  return FEATURE_ORDER.filter((id) => getFeatureConfig(settings, id).enabled);
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  settings: HouseSettings | null | undefined,
  featureId: FeatureId
): boolean {
  return getFeatureConfig(settings, featureId).enabled;
}

/**
 * Get feature display label
 */
export function getFeatureLabel(
  settings: HouseSettings | null | undefined,
  featureId: FeatureId
): string {
  return getFeatureConfig(settings, featureId).label;
}
