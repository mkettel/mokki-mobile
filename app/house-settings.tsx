import { GeometricBackground } from "@/components/GeometricBackground";
import { ColorPicker } from "@/components/settings";
import { TopBar } from "@/components/TopBar";
import { DEFAULT_FEATURE_CONFIG, FEATURE_ORDER } from "@/constants/features";
import { typography } from "@/constants/theme";
import { updateHouseSettings } from "@/lib/api/house";
import { GUEST_FEE_PER_NIGHT } from "@/lib/api/stays";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { getFeatureConfig } from "@/lib/utils/features";
import type { FeatureId, HouseSettings } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface FeatureRowProps {
  featureId: FeatureId;
  enabled: boolean;
  label: string;
  defaultLabel: string;
  onToggle: (enabled: boolean) => void;
  onLabelChange: (label: string) => void;
}

function FeatureRow({
  featureId,
  enabled,
  label,
  defaultLabel,
  onToggle,
  onLabelChange,
}: FeatureRowProps) {
  const colors = useColors();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);

  const handleEditStart = () => {
    setEditValue(label);
    setIsEditing(true);
  };

  const handleEditEnd = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onLabelChange(trimmed);
    } else {
      setEditValue(label);
    }
  };

  const handleReset = () => {
    onLabelChange(defaultLabel);
    setEditValue(defaultLabel);
  };

  return (
    <View
      style={[
        styles.featureRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.featureToggle}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.background}
        />
      </View>

      <View style={styles.featureContent}>
        {isEditing ? (
          <TextInput
            style={[
              styles.featureLabelInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            value={editValue}
            onChangeText={setEditValue}
            onBlur={handleEditEnd}
            onSubmitEditing={handleEditEnd}
            autoFocus
            selectTextOnFocus
            maxLength={30}
          />
        ) : (
          <TouchableOpacity
            onPress={handleEditStart}
            style={styles.labelTouchable}
          >
            <Text
              style={[
                styles.featureLabel,
                { color: enabled ? colors.foreground : colors.foreground },
              ]}
            >
              {label}
            </Text>
            <FontAwesome
              name="pencil"
              size={12}
              color={colors.foreground}
              style={styles.editIcon}
            />
          </TouchableOpacity>
        )}

        {label !== defaultLabel && !isEditing && (
          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.resetText, { color: colors.foreground }]}>
              Reset to default
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function HouseSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeHouse, refreshHouses, archiveHouse } = useHouse();

  const [isSaving, setIsSaving] = useState(false);
  const [localFeatures, setLocalFeatures] = useState<
    Record<FeatureId, { enabled: boolean; label: string }>
  >({} as Record<FeatureId, { enabled: boolean; label: string }>);
  const [localAccentColor, setLocalAccentColor] = useState<string | undefined>(
    undefined
  );

  // Trip timer state
  const [tripTimerEnabled, setTripTimerEnabled] = useState(false);
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Guest fees state
  const [localGuestNightlyRate, setLocalGuestNightlyRate] =
    useState<number>(GUEST_FEE_PER_NIGHT);
  const [guestRateInput, setGuestRateInput] = useState<string>(
    GUEST_FEE_PER_NIGHT.toString()
  );

  // Check if user is admin
  const isAdmin = activeHouse?.role === "admin";

  // Initialize local features and theme from house settings
  useEffect(() => {
    if (activeHouse) {
      const houseSettings = activeHouse.settings as HouseSettings | undefined;
      const features: Record<FeatureId, { enabled: boolean; label: string }> =
        {} as Record<FeatureId, { enabled: boolean; label: string }>;

      for (const featureId of FEATURE_ORDER) {
        const config = getFeatureConfig(houseSettings, featureId);
        features[featureId] = {
          enabled: config.enabled,
          label: config.label,
        };
      }

      setLocalFeatures(features);
      setLocalAccentColor(houseSettings?.theme?.accentColor);

      // Initialize trip timer settings
      const tripTimer = houseSettings?.tripTimer;
      setTripTimerEnabled(tripTimer?.enabled ?? false);
      setTripStartDate(
        tripTimer?.startDate ? new Date(tripTimer.startDate) : null
      );
      setTripEndDate(tripTimer?.endDate ? new Date(tripTimer.endDate) : null);

      // Initialize guest nightly rate
      const rate = houseSettings?.guestNightlyRate ?? GUEST_FEE_PER_NIGHT;
      setLocalGuestNightlyRate(rate);
      setGuestRateInput(rate.toString());
    }
  }, [activeHouse]);

  // Redirect if not admin
  useEffect(() => {
    if (activeHouse && !isAdmin) {
      router.back();
    }
  }, [activeHouse, isAdmin, router]);

  const handleFeatureToggle = async (
    featureId: FeatureId,
    enabled: boolean
  ) => {
    if (!activeHouse?.id) return;

    // Update local state immediately
    setLocalFeatures((prev) => ({
      ...prev,
      [featureId]: { ...prev[featureId], enabled },
    }));

    // Save to server
    setIsSaving(true);
    const { success, error } = await updateHouseSettings(activeHouse.id, {
      features: {
        [featureId]: { enabled },
      },
    });

    if (error) {
      // Revert on error
      setLocalFeatures((prev) => ({
        ...prev,
        [featureId]: { ...prev[featureId], enabled: !enabled },
      }));

      const message = "Failed to update feature settings";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      // Refresh houses to sync the settings
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleLabelChange = async (featureId: FeatureId, label: string) => {
    if (!activeHouse?.id) return;

    const previousLabel = localFeatures[featureId]?.label;

    // Update local state immediately
    setLocalFeatures((prev) => ({
      ...prev,
      [featureId]: { ...prev[featureId], label },
    }));

    // Save to server
    setIsSaving(true);
    const { success, error } = await updateHouseSettings(activeHouse.id, {
      features: {
        [featureId]: { label },
      },
    });

    if (error) {
      // Revert on error
      setLocalFeatures((prev) => ({
        ...prev,
        [featureId]: { ...prev[featureId], label: previousLabel },
      }));

      const message = "Failed to update label";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      // Refresh houses to sync the settings
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleAccentColorChange = async (color: string | undefined) => {
    if (!activeHouse?.id) return;

    const previousColor = localAccentColor;

    // Update local state immediately
    setLocalAccentColor(color);

    // Save to server
    setIsSaving(true);
    const { success, error } = await updateHouseSettings(activeHouse.id, {
      theme: {
        accentColor: color,
      },
    });

    if (error) {
      // Revert on error
      setLocalAccentColor(previousColor);

      const message = "Failed to update accent color";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      // Refresh houses to sync the settings
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleTripTimerToggle = async (enabled: boolean) => {
    if (!activeHouse?.id) return;

    setTripTimerEnabled(enabled);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      tripTimer: {
        enabled,
        startDate: tripStartDate?.toISOString().split("T")[0],
        endDate: tripEndDate?.toISOString().split("T")[0],
      },
    });

    if (error) {
      setTripTimerEnabled(!enabled);
      const message = "Failed to update trip timer settings";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleStartDateChange = async (date: Date | null) => {
    if (!activeHouse?.id) return;

    const previousDate = tripStartDate;
    setTripStartDate(date);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      tripTimer: {
        enabled: tripTimerEnabled,
        startDate: date?.toISOString().split("T")[0],
        endDate: tripEndDate?.toISOString().split("T")[0],
      },
    });

    if (error) {
      setTripStartDate(previousDate);
      const message = "Failed to update start date";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleEndDateChange = async (date: Date | null) => {
    if (!activeHouse?.id) return;

    const previousDate = tripEndDate;
    setTripEndDate(date);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      tripTimer: {
        enabled: tripTimerEnabled,
        startDate: tripStartDate?.toISOString().split("T")[0],
        endDate: date?.toISOString().split("T")[0],
      },
    });

    if (error) {
      setTripEndDate(previousDate);
      const message = "Failed to update end date";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleClearDates = async () => {
    if (!activeHouse?.id) return;

    const previousStart = tripStartDate;
    const previousEnd = tripEndDate;
    setTripStartDate(null);
    setTripEndDate(null);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      tripTimer: {
        enabled: tripTimerEnabled,
        startDate: undefined,
        endDate: undefined,
      },
    });

    if (error) {
      setTripStartDate(previousStart);
      setTripEndDate(previousEnd);
      const message = "Failed to clear dates";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleGuestRateChange = async (value: string) => {
    // Update input immediately for responsive typing
    setGuestRateInput(value);

    // Parse the value
    const numericValue = parseInt(value, 10);

    // Only save if it's a valid non-negative number
    if (isNaN(numericValue) || numericValue < 0) {
      return;
    }

    if (!activeHouse?.id) return;

    const previousRate = localGuestNightlyRate;
    setLocalGuestNightlyRate(numericValue);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      guestNightlyRate: numericValue,
    });

    if (error) {
      setLocalGuestNightlyRate(previousRate);
      setGuestRateInput(previousRate.toString());
      const message = "Failed to update guest nightly rate";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      await refreshHouses();
    }

    setIsSaving(false);
  };

  const handleGuestRateBlur = () => {
    // On blur, if input is empty or invalid, reset to current value
    const numericValue = parseInt(guestRateInput, 10);
    if (isNaN(numericValue) || numericValue < 0) {
      setGuestRateInput(localGuestNightlyRate.toString());
    }
  };

  const handleArchiveHouse = async () => {
    if (!activeHouse) return;

    const isArchived = activeHouse.isArchived;
    const action = isArchived ? "Unarchive" : "Archive";
    const message = isArchived
      ? `Unarchive "${activeHouse.name}"? It will appear in your house list again.`
      : `Archive "${activeHouse.name}"? You can still access it by toggling "Show Archived" in the house picker.`;

    const doArchive = async () => {
      try {
        await archiveHouse(activeHouse.id, !isArchived);
        router.back();
      } catch (error) {
        const errorMessage = `Failed to ${action.toLowerCase()} house`;
        if (Platform.OS === "web") {
          window.alert(errorMessage);
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        await doArchive();
      }
    } else {
      Alert.alert(action, message, [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          onPress: doArchive,
          style: isArchived ? "default" : "destructive",
        },
      ]);
    }
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!activeHouse || !isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />
      <TopBar />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome
            name="chevron-left"
            size={18}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          House Settings
        </Text>
        <View style={styles.headerSpacer}>
          {isSaving && (
            <ActivityIndicator size="small" color={colors.foreground} />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* House Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            House
          </Text>
          <View
            style={[
              styles.houseNameCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.houseName, { color: colors.foreground }]}>
              {activeHouse.name}
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Features
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.foreground }]}
          >
            Toggle features on or off and customize their labels. Disabled
            features won't appear in navigation.
          </Text>

          <View style={styles.featuresList}>
            {FEATURE_ORDER.map((featureId) => (
              <FeatureRow
                key={featureId}
                featureId={featureId}
                enabled={localFeatures[featureId]?.enabled ?? true}
                label={
                  localFeatures[featureId]?.label ??
                  DEFAULT_FEATURE_CONFIG[featureId].label
                }
                defaultLabel={DEFAULT_FEATURE_CONFIG[featureId].label}
                onToggle={(enabled) => handleFeatureToggle(featureId, enabled)}
                onLabelChange={(label) => handleLabelChange(featureId, label)}
              />
            ))}
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Theme
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.foreground }]}
          >
            Customize the mountain color for your house.
          </Text>

          <View
            style={[
              styles.themeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.themeLabel, { color: colors.foreground }]}>
              Mountain Color
            </Text>
            <ColorPicker
              selectedColor={localAccentColor}
              onColorSelect={handleAccentColorChange}
            />
          </View>
        </View>

        {/* Trip Timer Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Trip Timer
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.foreground }]}
          >
            Display a countdown or trip day counter on the home screen.
          </Text>

          <View
            style={[
              styles.themeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Enable/Disable Toggle */}
            <View style={styles.tripTimerToggleRow}>
              <Text
                style={[
                  styles.themeLabel,
                  { color: colors.foreground, marginBottom: 0 },
                ]}
              >
                Show Trip Timer
              </Text>
              <Switch
                value={tripTimerEnabled}
                onValueChange={handleTripTimerToggle}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            {tripTimerEnabled && (
              <>
                {/* Start Date Picker */}
                <View style={styles.dateField}>
                  <Text
                    style={[styles.dateLabel, { color: colors.foreground }]}
                  >
                    Trip Start Date
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      {
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <FontAwesome
                      name="calendar"
                      size={16}
                      color={colors.foreground}
                    />
                    <Text
                      style={[styles.dateText, { color: colors.foreground }]}
                    >
                      {tripStartDate
                        ? formatDateDisplay(tripStartDate)
                        : "Select date..."}
                    </Text>
                  </TouchableOpacity>
                  {(showStartDatePicker || Platform.OS === "ios") && (
                    <DateTimePicker
                      value={tripStartDate || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, date) => {
                        setShowStartDatePicker(false);
                        if (date) handleStartDateChange(date);
                      }}
                      style={
                        Platform.OS === "ios" ? styles.iosPicker : undefined
                      }
                    />
                  )}
                </View>

                {/* End Date Picker (Optional) */}
                <View style={styles.dateField}>
                  <Text
                    style={[styles.dateLabel, { color: colors.foreground }]}
                  >
                    Trip End Date (Optional)
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      {
                        backgroundColor: colors.muted,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <FontAwesome
                      name="calendar"
                      size={16}
                      color={colors.foreground}
                    />
                    <Text
                      style={[styles.dateText, { color: colors.foreground }]}
                    >
                      {tripEndDate
                        ? formatDateDisplay(tripEndDate)
                        : "No end date"}
                    </Text>
                  </TouchableOpacity>
                  {(showEndDatePicker || Platform.OS === "ios") && (
                    <DateTimePicker
                      value={tripEndDate || tripStartDate || new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, date) => {
                        setShowEndDatePicker(false);
                        if (date) handleEndDateChange(date);
                      }}
                      minimumDate={tripStartDate || undefined}
                      style={
                        Platform.OS === "ios" ? styles.iosPicker : undefined
                      }
                    />
                  )}
                </View>

                {/* Clear Dates Button */}
                {(tripStartDate || tripEndDate) && (
                  <TouchableOpacity
                    onPress={handleClearDates}
                    style={styles.clearDatesButton}
                  >
                    <Text
                      style={[
                        styles.clearDatesText,
                        { color: colors.destructive },
                      ]}
                    >
                      Clear Dates
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Guest Fees Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Guest Fees
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.foreground }]}
          >
            Set the nightly rate charged per guest. Set to 0 for free guests.
          </Text>

          <View
            style={[
              styles.themeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.themeLabel,
                { color: colors.foreground, marginBottom: 0 },
              ]}
            >
              Nightly Rate
            </Text>
            <View style={styles.guestRateRow}>
              <Text
                style={[styles.currencyPrefix, { color: colors.foreground }]}
              >
                $
              </Text>
              <TextInput
                style={[
                  styles.guestRateInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.muted,
                  },
                ]}
                value={guestRateInput}
                onChangeText={handleGuestRateChange}
                onBlur={handleGuestRateBlur}
                keyboardType="numeric"
                maxLength={5}
                selectTextOnFocus
              />
              <Text style={[styles.rateSuffix, { color: colors.foreground }]}>
                per guest per night
              </Text>
            </View>
          </View>
        </View>

        {/* Archive House Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Archive
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.foreground }]}
          >
            {activeHouse.isArchived
              ? "This house is currently archived. Unarchive it to show it in your house picker."
              : "Archive this house to hide it from your house picker. You can unarchive it anytime."}
          </Text>

          <TouchableOpacity
            style={[
              styles.archiveButton,
              {
                backgroundColor: activeHouse.isArchived
                  ? colors.primary
                  : colors.muted,
                borderColor: colors.border,
              },
            ]}
            onPress={handleArchiveHouse}
          >
            <FontAwesome
              name={activeHouse.isArchived ? "eye" : "archive"}
              size={16}
              color={
                activeHouse.isArchived
                  ? colors.primaryForeground
                  : colors.foreground
              }
              style={styles.archiveButtonIcon}
            />
            <Text
              style={[
                styles.archiveButtonText,
                {
                  color: activeHouse.isArchived
                    ? colors.primaryForeground
                    : colors.foreground,
                },
              ]}
            >
              {activeHouse.isArchived ? "Unarchive House" : "Archive House"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  headerSpacer: {
    width: 32,
    alignItems: "flex-end",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 12,
    lineHeight: 20,
  },
  houseNameCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  houseName: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  featuresList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureToggle: {
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  labelTouchable: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureLabel: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  featureLabelInput: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  editIcon: {
    marginLeft: 8,
  },
  resetText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  themeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 12,
  },
  tripTimerToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateField: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  iosPicker: {
    height: 120,
    marginTop: -8,
  },
  clearDatesButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  clearDatesText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  archiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  archiveButtonIcon: {
    marginRight: 8,
  },
  archiveButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  guestRateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  guestRateInput: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    textAlign: "center",
  },
  rateSuffix: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
});
