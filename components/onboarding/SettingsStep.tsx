import { ColorPicker } from "@/components/settings/ColorPicker";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

interface SettingsStepProps {
  guestNightlyRate: number;
  onGuestNightlyRateChange: (rate: number) => void;
  accentColor: string | undefined;
  onAccentColorChange: (color: string | undefined) => void;
  bedSignupEnabled: boolean;
  onBedSignupEnabledChange: (enabled: boolean) => void;
}

export function SettingsStep({
  guestNightlyRate,
  onGuestNightlyRateChange,
  accentColor,
  onAccentColorChange,
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
            Theme Color
          </Text>
        </View>
        <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
          Choose a mountain color for your house.
        </Text>

        <ColorPicker
          selectedColor={accentColor}
          onColorSelect={onAccentColorChange}
        />
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
});
