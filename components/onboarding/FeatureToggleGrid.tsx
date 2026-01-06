import { typography } from "@/constants/theme";
import { FEATURE_INFO, type FeatureInfo } from "@/constants/templates";
import { useColors } from "@/lib/context/theme";
import type { FeatureId } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

interface FeatureToggleGridProps {
  features: Record<FeatureId, boolean>;
  onToggle: (featureId: FeatureId, enabled: boolean) => void;
}

export function FeatureToggleGrid({ features, onToggle }: FeatureToggleGridProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Choose features
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Enable the features your house needs. You can change these anytime in House Settings.
      </Text>

      <View style={styles.featureList}>
        {FEATURE_INFO.map((feature) => (
          <FeatureToggleRow
            key={feature.id}
            feature={feature}
            enabled={features[feature.id]}
            onToggle={(enabled) => onToggle(feature.id, enabled)}
          />
        ))}
      </View>
    </View>
  );
}

interface FeatureToggleRowProps {
  feature: FeatureInfo;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function FeatureToggleRow({ feature, enabled, onToggle }: FeatureToggleRowProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: enabled ? colors.primary : colors.muted },
        ]}
      >
        <FontAwesome
          name={feature.icon as any}
          size={16}
          color={enabled ? colors.primaryForeground : colors.mutedForeground}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {feature.name}
        </Text>
        <Text
          style={[styles.description, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {feature.description}
        </Text>
      </View>

      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={colors.background}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 24,
    lineHeight: 20,
  },
  featureList: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
