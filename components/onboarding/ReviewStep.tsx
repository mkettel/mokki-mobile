import { typography } from "@/constants/theme";
import { HOUSE_TEMPLATES, type HouseTemplateId } from "@/constants/templates";
import { useColors } from "@/lib/context/theme";
import type { FeatureId } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ReviewStepProps {
  houseName: string;
  templateId: HouseTemplateId;
  features: Record<FeatureId, boolean>;
  guestNightlyRate: number;
  tripStartDate: Date | null;
  tripEndDate: Date | null;
  accentColor: string | undefined;
}

export function ReviewStep({
  houseName,
  templateId,
  features,
  guestNightlyRate,
  tripStartDate,
  tripEndDate,
  accentColor,
}: ReviewStepProps) {
  const colors = useColors();
  const template = HOUSE_TEMPLATES[templateId];
  const enabledFeatureCount = Object.values(features).filter(Boolean).length;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Review & create
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Here's a summary of your new house. You can change any of this later in House Settings.
      </Text>

      {/* Summary Card */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* House Name */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelRow}>
            <FontAwesome name="home" size={14} color={colors.mutedForeground} />
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              House Name
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {houseName || "Unnamed House"}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Template */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelRow}>
            <FontAwesome name={template.icon as any} size={14} color={colors.mutedForeground} />
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Template
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {template.name}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Features */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelRow}>
            <FontAwesome name="th-large" size={14} color={colors.mutedForeground} />
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Features
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {enabledFeatureCount} enabled
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Guest Fees */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelRow}>
            <FontAwesome name="dollar" size={14} color={colors.mutedForeground} />
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Guest Fee
            </Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {guestNightlyRate > 0 ? `$${guestNightlyRate}/night` : "Free"}
          </Text>
        </View>

        {/* Trip Dates (if set) */}
        {(tripStartDate || tripEndDate) && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelRow}>
                <FontAwesome name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Trip Dates
                </Text>
              </View>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {formatDate(tripStartDate)}
                {tripEndDate ? ` - ${formatDate(tripEndDate)}` : ""}
              </Text>
            </View>
          </>
        )}

        {/* Theme Color */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelRow}>
            <FontAwesome name="paint-brush" size={14} color={colors.mutedForeground} />
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Theme
            </Text>
          </View>
          <View style={styles.colorPreview}>
            <View
              style={[styles.colorSwatch, { backgroundColor: accentColor }]}
            />
          </View>
        </View>
      </View>

      {/* Ready message */}
      <View style={styles.readyMessage}>
        <FontAwesome name="check-circle" size={20} color={colors.primary} />
        <Text style={[styles.readyText, { color: colors.foreground }]}>
          Ready to create your house!
        </Text>
      </View>
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
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  colorPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  readyMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 16,
  },
  readyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
