import { ColorPicker } from "@/components/settings/ColorPicker";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { BackgroundPattern } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SettingsStepProps {
  guestNightlyRate: number;
  onGuestNightlyRateChange: (rate: number) => void;
  accentColor: string | undefined;
  onAccentColorChange: (color: string | undefined) => void;
  backgroundPattern: BackgroundPattern;
  onBackgroundPatternChange: (pattern: BackgroundPattern) => void;
  bedSignupEnabled: boolean;
  onBedSignupEnabledChange: (enabled: boolean) => void;
}

export function SettingsStep({
  guestNightlyRate,
  onGuestNightlyRateChange,
  accentColor,
  onAccentColorChange,
  backgroundPattern,
  onBackgroundPatternChange,
  bedSignupEnabled,
  onBedSignupEnabledChange,
}: SettingsStepProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Final settings
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Configure how your house works. All of these can be changed later.
      </Text>

      {/* Guest Fees */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <FontAwesome name="dollar" size={16} color={colors.foreground} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Guest Fees
          </Text>
        </View>
        <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
          Charge a nightly rate when members bring extra guests.
        </Text>

        <View style={styles.rateRow}>
          <Text style={[styles.rateLabel, { color: colors.foreground }]}>
            Per guest, per night
          </Text>
          <View style={styles.rateInput}>
            <Text style={[styles.currencySymbol, { color: colors.foreground }]}>
              $
            </Text>
            <TextInput
              style={[
                styles.rateTextInput,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={guestNightlyRate.toString()}
              onChangeText={(text) => {
                const rate = parseInt(text) || 0;
                onGuestNightlyRateChange(rate);
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Set to $0 for free guests. You'll be the default recipient as the house admin.
        </Text>
      </View>

      {/* Theme */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <FontAwesome name="paint-brush" size={16} color={colors.foreground} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Background Style
          </Text>
        </View>
        <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
          Choose a background style for your house.
        </Text>

        {/* Background Style Picker */}
        <View style={styles.backgroundStylePicker}>
          <TouchableOpacity
            style={[
              styles.backgroundStyleOption,
              {
                backgroundColor:
                  backgroundPattern === "mountains"
                    ? colors.primary
                    : colors.muted,
                borderColor:
                  backgroundPattern === "mountains"
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={() => onBackgroundPatternChange("mountains")}
          >
            <FontAwesome
              name="area-chart"
              size={18}
              color={
                backgroundPattern === "mountains"
                  ? colors.primaryForeground
                  : colors.foreground
              }
            />
            <Text
              style={[
                styles.backgroundStyleText,
                {
                  color:
                    backgroundPattern === "mountains"
                      ? colors.primaryForeground
                      : colors.foreground,
                },
              ]}
            >
              Mountains
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.backgroundStyleOption,
              {
                backgroundColor:
                  backgroundPattern === "none"
                    ? colors.primary
                    : colors.muted,
                borderColor:
                  backgroundPattern === "none"
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={() => onBackgroundPatternChange("none")}
          >
            <FontAwesome
              name="square"
              size={18}
              color={
                backgroundPattern === "none"
                  ? colors.primaryForeground
                  : colors.foreground
              }
            />
            <Text
              style={[
                styles.backgroundStyleText,
                {
                  color:
                    backgroundPattern === "none"
                      ? colors.primaryForeground
                      : colors.foreground,
                },
              ]}
            >
              Solid
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mountain Color Picker - only show when mountains selected */}
        {backgroundPattern === "mountains" && (
          <View style={styles.colorPickerContainer}>
            <Text style={[styles.colorPickerLabel, { color: colors.foreground }]}>
              Mountain Color
            </Text>
            <ColorPicker
              selectedColor={accentColor}
              onColorSelect={onAccentColorChange}
            />
          </View>
        )}
      </View>

      {/* Bed Sign-Up */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={styles.cardHeader}>
              <FontAwesome name="bed" size={16} color={colors.foreground} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Bed Sign-Up
              </Text>
            </View>
            <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
              Let members claim beds for upcoming weekends.
            </Text>
          </View>
          <Switch
            value={bedSignupEnabled}
            onValueChange={onBedSignupEnabledChange}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>
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
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 12,
    lineHeight: 18,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rateLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  rateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  rateTextInput: {
    width: 70,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  backgroundStylePicker: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  backgroundStyleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  backgroundStyleText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  colorPickerContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  colorPickerLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 12,
  },
});
