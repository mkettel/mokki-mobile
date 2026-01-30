import { AdminPingModal } from "@/components/admin";
import { GeometricBackground } from "@/components/GeometricBackground";
import { ColorPicker } from "@/components/settings";
import { TopBar } from "@/components/TopBar";
import { DEFAULT_FEATURE_CONFIG, FEATURE_ORDER } from "@/constants/features";
import {
  DEFAULT_SESSION_BOOKING_CONFIG,
  DURATION_OPTIONS,
} from "@/constants/sessionBooking";
import { typography } from "@/constants/theme";
import {
  closeSignupWindow,
  createSignupWindow,
  getWindowStatus,
  openSignupWindow,
  WindowStatus,
} from "@/lib/api/bedSignups";
import { getHouseMembersForExpenses } from "@/lib/api/expenses";
import { updateHouseSettings } from "@/lib/api/house";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/dates";
import { hasRoomsConfigured } from "@/lib/api/rooms";
import { GUEST_FEE_PER_NIGHT } from "@/lib/api/stays";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { getFeatureConfig } from "@/lib/utils/features";
import type { FeatureId, HouseSettings, Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Tab configuration
type SettingsTab = "general" | "features" | "trip" | "members" | "bookings";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
}

const SETTINGS_TABS: TabConfig[] = [
  { id: "general", label: "General", icon: "home" },
  { id: "features", label: "Features", icon: "th-large" },
  { id: "trip", label: "Trip", icon: "calendar" },
  { id: "members", label: "Members", icon: "users" },
  { id: "bookings", label: "Bookings", icon: "clock-o" },
];

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

  // Guest fee recipient state
  const [localGuestFeeRecipient, setLocalGuestFeeRecipient] = useState<
    string | null
  >(null);
  const [members, setMembers] = useState<Profile[]>([]);

  // Member profile settings
  const [showRiderType, setShowRiderType] = useState(false);

  // Session booking state
  const [sessionBookingEnabled, setSessionBookingEnabled] = useState(false);
  const [sessionBookingLabel, setSessionBookingLabel] = useState(
    DEFAULT_SESSION_BOOKING_CONFIG.label || "Book a Session"
  );
  const [sessionBookingDuration, setSessionBookingDuration] = useState(
    DEFAULT_SESSION_BOOKING_CONFIG.defaultDuration || 45
  );
  const [sessionBookingDescription, setSessionBookingDescription] = useState("");
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Bed sign-up state
  const [bedSignupEnabled, setBedSignupEnabled] = useState(false);
  const [autoScheduleWindows, setAutoScheduleWindows] = useState(true);
  const [roomCount, setRoomCount] = useState(0);
  const [bedCount, setBedCount] = useState(0);
  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null);
  const [isLoadingWindowStatus, setIsLoadingWindowStatus] = useState(false);
  const [showCustomWindowModal, setShowCustomWindowModal] = useState(false);
  const [customWeekendStart, setCustomWeekendStart] = useState<Date | null>(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Admin ping modal state
  const [showAdminPingModal, setShowAdminPingModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

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
        tripTimer?.startDate ? parseLocalDate(tripTimer.startDate) : null
      );
      setTripEndDate(tripTimer?.endDate ? parseLocalDate(tripTimer.endDate) : null);

      // Initialize guest nightly rate
      const rate = houseSettings?.guestNightlyRate ?? GUEST_FEE_PER_NIGHT;
      setLocalGuestNightlyRate(rate);
      setGuestRateInput(rate.toString());

      // Initialize guest fee recipient
      setLocalGuestFeeRecipient(houseSettings?.guestFeeRecipient ?? null);

      // Initialize bed sign-up
      setBedSignupEnabled(houseSettings?.bedSignupEnabled ?? false);
      setAutoScheduleWindows(houseSettings?.autoScheduleWindows ?? true);

      // Initialize member profile settings
      setShowRiderType(houseSettings?.showRiderType ?? false);

      // Initialize session booking settings
      setSessionBookingEnabled(houseSettings?.sessionBookingEnabled ?? false);
      setSessionBookingLabel(
        houseSettings?.sessionBookingConfig?.label ||
          DEFAULT_SESSION_BOOKING_CONFIG.label ||
          "Book a Session"
      );
      setSessionBookingDuration(
        houseSettings?.sessionBookingConfig?.defaultDuration ||
          DEFAULT_SESSION_BOOKING_CONFIG.defaultDuration ||
          45
      );
      setSessionBookingDescription(
        houseSettings?.sessionBookingConfig?.description || ""
      );
    }
  }, [activeHouse]);

  // Fetch house members for recipient picker
  useEffect(() => {
    if (activeHouse?.id) {
      getHouseMembersForExpenses(activeHouse.id).then(({ members: m }) => {
        setMembers(m);
      });
    }
  }, [activeHouse?.id]);

  // Fetch room/bed counts for bed sign-up section
  useEffect(() => {
    if (activeHouse?.id) {
      hasRoomsConfigured(activeHouse.id).then(({ roomCount: rc, bedCount: bc }) => {
        setRoomCount(rc);
        setBedCount(bc);
      });
    }
  }, [activeHouse?.id]);

  // Fetch window status for bed sign-up section
  const fetchWindowStatus = async () => {
    if (!activeHouse?.id || !bedSignupEnabled) return;

    setIsLoadingWindowStatus(true);
    const { status, error } = await getWindowStatus(activeHouse.id);
    if (!error) {
      setWindowStatus(status);
    }
    setIsLoadingWindowStatus(false);
  };

  useEffect(() => {
    fetchWindowStatus();
  }, [activeHouse?.id, bedSignupEnabled]);

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
        startDate: tripStartDate ? formatLocalDate(tripStartDate) : undefined,
        endDate: tripEndDate ? formatLocalDate(tripEndDate) : undefined,
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
        startDate: date ? formatLocalDate(date) : undefined,
        endDate: tripEndDate ? formatLocalDate(tripEndDate) : undefined,
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
        startDate: tripStartDate ? formatLocalDate(tripStartDate) : undefined,
        endDate: date ? formatLocalDate(date) : undefined,
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

  const handleGuestFeeRecipientChange = async (userId: string | null) => {
    if (!activeHouse?.id) return;

    const previousRecipient = localGuestFeeRecipient;
    setLocalGuestFeeRecipient(userId);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      guestFeeRecipient: userId ?? undefined,
    });

    if (error) {
      setLocalGuestFeeRecipient(previousRecipient);
      const message = "Failed to update guest fee recipient";
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

  const handleShowRiderTypeToggle = async (enabled: boolean) => {
    if (!activeHouse?.id) return;

    const previousValue = showRiderType;
    setShowRiderType(enabled);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      showRiderType: enabled,
    });

    if (error) {
      setShowRiderType(previousValue);
      const message = "Failed to update rider type setting";
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

  const handleSessionBookingToggle = async (enabled: boolean) => {
    if (!activeHouse?.id) return;

    const previousValue = sessionBookingEnabled;
    setSessionBookingEnabled(enabled);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      sessionBookingEnabled: enabled,
    });

    if (error) {
      setSessionBookingEnabled(previousValue);
      const message = "Failed to update session booking setting";
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

  const handleSessionBookingLabelChange = async (label: string) => {
    if (!activeHouse?.id) return;

    const previousLabel = sessionBookingLabel;
    setSessionBookingLabel(label);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      sessionBookingConfig: {
        label,
        defaultDuration: sessionBookingDuration,
        description: sessionBookingDescription || undefined,
      },
    });

    if (error) {
      setSessionBookingLabel(previousLabel);
      const message = "Failed to update session label";
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

  const handleSessionBookingDurationChange = async (duration: number) => {
    if (!activeHouse?.id) return;

    const previousDuration = sessionBookingDuration;
    setSessionBookingDuration(duration);
    setShowDurationPicker(false);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      sessionBookingConfig: {
        label: sessionBookingLabel,
        defaultDuration: duration,
        description: sessionBookingDescription || undefined,
      },
    });

    if (error) {
      setSessionBookingDuration(previousDuration);
      const message = "Failed to update session duration";
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

  const handleSessionBookingDescriptionChange = async (description: string) => {
    if (!activeHouse?.id) return;

    const previousDescription = sessionBookingDescription;
    setSessionBookingDescription(description);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      sessionBookingConfig: {
        label: sessionBookingLabel,
        defaultDuration: sessionBookingDuration,
        description: description || undefined,
      },
    });

    if (error) {
      setSessionBookingDescription(previousDescription);
      const message = "Failed to update session description";
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

  const handleBedSignupToggle = async (enabled: boolean) => {
    if (!activeHouse?.id) return;

    const previousValue = bedSignupEnabled;
    setBedSignupEnabled(enabled);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      bedSignupEnabled: enabled,
    });

    if (error) {
      setBedSignupEnabled(previousValue);
      const message = "Failed to update bed sign-up setting";
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

  const handleAutoScheduleToggle = async (enabled: boolean) => {
    if (!activeHouse?.id) return;

    const previousValue = autoScheduleWindows;
    setAutoScheduleWindows(enabled);
    setIsSaving(true);

    const { error } = await updateHouseSettings(activeHouse.id, {
      autoScheduleWindows: enabled,
    });

    if (error) {
      setAutoScheduleWindows(previousValue);
      const message = "Failed to update auto-schedule setting";
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

  const handleOpenWindowNow = async () => {
    if (!windowStatus?.nextScheduledWindow?.id) return;

    const confirmMessage = `Open sign-up now for the ${formatWeekendDates(
      windowStatus.nextScheduledWindow.target_weekend_start,
      windowStatus.nextScheduledWindow.target_weekend_end
    )} weekend?`;

    const doOpen = async () => {
      setIsSaving(true);
      const { error } = await openSignupWindow(windowStatus.nextScheduledWindow!.id);
      if (error) {
        const message = "Failed to open sign-up window";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Error", message);
        }
      } else {
        await fetchWindowStatus();
      }
      setIsSaving(false);
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        await doOpen();
      }
    } else {
      Alert.alert("Open Sign-Up Now", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: "Open Now", onPress: doOpen },
      ]);
    }
  };

  const handleCloseWindow = async () => {
    if (!windowStatus?.activeWindow?.id) return;

    const confirmMessage = `Close sign-up for the ${formatWeekendDates(
      windowStatus.activeWindow.target_weekend_start,
      windowStatus.activeWindow.target_weekend_end
    )} weekend? This cannot be undone.`;

    const doClose = async () => {
      setIsSaving(true);
      const { error } = await closeSignupWindow(windowStatus.activeWindow!.id);
      if (error) {
        const message = "Failed to close sign-up window";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Error", message);
        }
      } else {
        await fetchWindowStatus();
      }
      setIsSaving(false);
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        await doClose();
      }
    } else {
      Alert.alert("Close Sign-Up", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: "Close", onPress: doClose, style: "destructive" },
      ]);
    }
  };

  const handleCreateCustomWindow = async () => {
    if (!activeHouse?.id || !customWeekendStart) return;

    // Calculate weekend end (Sunday = start + 2 days)
    const weekendEnd = new Date(customWeekendStart);
    weekendEnd.setDate(weekendEnd.getDate() + 2);

    setIsSaving(true);
    const { window: newWindow, error } = await createSignupWindow(activeHouse.id, {
      targetWeekendStart: formatLocalDate(customWeekendStart),
      targetWeekendEnd: formatLocalDate(weekendEnd),
      opensAt: new Date().toISOString(),
      status: "open",
    });

    if (error) {
      const message = "Failed to create sign-up window";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } else {
      setShowCustomWindowModal(false);
      setCustomWeekendStart(null);
      await fetchWindowStatus();
    }
    setIsSaving(false);
  };

  const formatWeekendDates = (start: string, end: string) => {
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  };

  const formatScheduledTime = (opensAt: string) => {
    const date = new Date(opensAt);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get the next Friday for custom window default
  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, get next Friday
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday;
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

      {/* Tab Bar */}
      <View style={[styles.tabBarContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  isActive && [styles.tabButtonActive, { borderBottomColor: colors.primary }],
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <FontAwesome
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isActive ? colors.primary : colors.mutedForeground },
                    isActive && styles.tabButtonTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERAL TAB */}
        {activeTab === "general" && (
          <>
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
          </>
        )}

        {/* FEATURES TAB */}
        {activeTab === "features" && (
          <>
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
          </>
        )}

        {/* TRIP TAB */}
        {activeTab === "trip" && (
          <>
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
                      {showStartDatePicker && (
                        <>
                          <DateTimePicker
                            value={tripStartDate || new Date()}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={(event, date) => {
                              if (Platform.OS === "android") {
                                setShowStartDatePicker(false);
                              }
                              if (date) handleStartDateChange(date);
                            }}
                            style={
                              Platform.OS === "ios" ? styles.iosPicker : undefined
                            }
                          />
                          {Platform.OS === "ios" && (
                            <TouchableOpacity
                              style={styles.pickerDoneButton}
                              onPress={() => setShowStartDatePicker(false)}
                            >
                              <Text style={[styles.pickerDoneText, { color: colors.primary }]}>
                                Done
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
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
                      {showEndDatePicker && (
                        <>
                          <DateTimePicker
                            value={tripEndDate || tripStartDate || new Date()}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={(event, date) => {
                              if (Platform.OS === "android") {
                                setShowEndDatePicker(false);
                              }
                              if (date) handleEndDateChange(date);
                            }}
                            minimumDate={tripStartDate || undefined}
                            style={
                              Platform.OS === "ios" ? styles.iosPicker : undefined
                            }
                          />
                          {Platform.OS === "ios" && (
                            <TouchableOpacity
                              style={styles.pickerDoneButton}
                              onPress={() => setShowEndDatePicker(false)}
                            >
                              <Text style={[styles.pickerDoneText, { color: colors.primary }]}>
                                Done
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
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

              {/* Guest Fee Recipient */}
              <Text
                style={[
                  styles.themeLabel,
                  { color: colors.foreground, marginTop: 16 },
                ]}
              >
                Fee Recipient
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: colors.foreground, marginBottom: 12 },
                ]}
              >
                Who receives guest fee payments. Defaults to the first admin.
              </Text>

              <View style={styles.recipientList}>
                {members.map((member) => {
                  const isSelected = localGuestFeeRecipient === member.id;
                  const displayName =
                    member.display_name || member.email.split("@")[0];
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.recipientOption,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + "20"
                            : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => handleGuestFeeRecipientChange(member.id)}
                    >
                      {member.avatar_url ? (
                        <Image
                          source={{ uri: member.avatar_url }}
                          style={styles.recipientAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.recipientAvatar,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          <Text
                            style={[
                              styles.recipientAvatarText,
                              { color: colors.foreground },
                            ]}
                          >
                            {initial}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[styles.recipientName, { color: colors.foreground }]}
                      >
                        {displayName}
                      </Text>
                      {isSelected && (
                        <FontAwesome
                          name="check"
                          size={16}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && (
          <>
            {/* Member Profiles Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Member Profiles
              </Text>
              <Text
                style={[styles.sectionDescription, { color: colors.foreground }]}
              >
                Configure which fields appear in member profiles.
              </Text>

              <View
                style={[
                  styles.themeCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.tripTimerToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.themeLabel,
                        { color: colors.foreground, marginBottom: 4 },
                      ]}
                    >
                      Rider Type
                    </Text>
                    <Text
                      style={[
                        styles.sectionDescription,
                        { color: colors.mutedForeground, marginBottom: 0 },
                      ]}
                    >
                      Show skier/snowboarder option
                    </Text>
                  </View>
                  <Switch
                    value={showRiderType}
                    onValueChange={handleShowRiderTypeToggle}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>
              </View>
            </View>

            {/* Send Notification Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Notifications
              </Text>
              <Text
                style={[styles.sectionDescription, { color: colors.foreground }]}
              >
                Send push notifications to all house members.
              </Text>

              <TouchableOpacity
                style={[
                  styles.notificationButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowAdminPingModal(true)}
              >
                <View
                  style={[
                    styles.notificationButtonIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <FontAwesome name="bell" size={18} color={colors.primary} />
                </View>
                <View style={styles.notificationButtonContent}>
                  <Text
                    style={[
                      styles.notificationButtonTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    Send Notification
                  </Text>
                  <Text
                    style={[
                      styles.notificationButtonSubtitle,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Ping all members with a message
                  </Text>
                </View>
                <FontAwesome
                  name="chevron-right"
                  size={14}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <>
            {/* Session Booking Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Session Booking
              </Text>
              <Text
                style={[styles.sectionDescription, { color: colors.foreground }]}
              >
                Allow members to request one-on-one sessions with admins (e.g., check-ins).
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
                    Enable Session Booking
                  </Text>
                  <Switch
                    value={sessionBookingEnabled}
                    onValueChange={handleSessionBookingToggle}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                {sessionBookingEnabled && (
                  <>
                    {/* Custom Label */}
                    <View style={styles.sessionBookingField}>
                      <Text
                        style={[styles.dateLabel, { color: colors.foreground }]}
                      >
                        Button Label
                      </Text>
                      <TextInput
                        style={[
                          styles.sessionBookingInput,
                          {
                            color: colors.foreground,
                            borderColor: colors.border,
                            backgroundColor: colors.muted,
                          },
                        ]}
                        value={sessionBookingLabel}
                        onChangeText={setSessionBookingLabel}
                        onBlur={() => handleSessionBookingLabelChange(sessionBookingLabel)}
                        placeholder="Book a Session"
                        placeholderTextColor={colors.mutedForeground}
                        maxLength={30}
                      />
                    </View>

                    {/* Duration Picker */}
                    <View style={styles.sessionBookingField}>
                      <Text
                        style={[styles.dateLabel, { color: colors.foreground }]}
                      >
                        Default Duration
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.dateButton,
                          {
                            backgroundColor: colors.muted,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setShowDurationPicker(!showDurationPicker)}
                      >
                        <FontAwesome
                          name="clock-o"
                          size={16}
                          color={colors.foreground}
                        />
                        <Text
                          style={[styles.dateText, { color: colors.foreground }]}
                        >
                          {DURATION_OPTIONS.find(
                            (opt) => opt.value === sessionBookingDuration
                          )?.label || `${sessionBookingDuration} minutes`}
                        </Text>
                        <FontAwesome
                          name={showDurationPicker ? "chevron-up" : "chevron-down"}
                          size={12}
                          color={colors.foreground}
                          style={{ marginLeft: "auto" }}
                        />
                      </TouchableOpacity>

                      {showDurationPicker && (
                        <View style={styles.durationPickerOptions}>
                          {DURATION_OPTIONS.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.durationOption,
                                {
                                  backgroundColor:
                                    sessionBookingDuration === option.value
                                      ? colors.primary + "20"
                                      : colors.card,
                                  borderColor:
                                    sessionBookingDuration === option.value
                                      ? colors.primary
                                      : colors.border,
                                },
                              ]}
                              onPress={() => handleSessionBookingDurationChange(option.value)}
                            >
                              <Text
                                style={[
                                  styles.durationOptionText,
                                  {
                                    color:
                                      sessionBookingDuration === option.value
                                        ? colors.primary
                                        : colors.foreground,
                                  },
                                ]}
                              >
                                {option.label}
                              </Text>
                              {sessionBookingDuration === option.value && (
                                <FontAwesome
                                  name="check"
                                  size={14}
                                  color={colors.primary}
                                />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Description (Optional) */}
                    <View style={styles.sessionBookingField}>
                      <Text
                        style={[styles.dateLabel, { color: colors.foreground }]}
                      >
                        Description (Optional)
                      </Text>
                      <TextInput
                        style={[
                          styles.sessionBookingInput,
                          styles.sessionBookingTextarea,
                          {
                            color: colors.foreground,
                            borderColor: colors.border,
                            backgroundColor: colors.muted,
                          },
                        ]}
                        value={sessionBookingDescription}
                        onChangeText={setSessionBookingDescription}
                        onBlur={() =>
                          handleSessionBookingDescriptionChange(sessionBookingDescription)
                        }
                        placeholder="Shown in booking modal..."
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                      />
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Bed Sign-Up Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Bed Sign-Up
              </Text>
              <Text
                style={[styles.sectionDescription, { color: colors.foreground }]}
              >
                Allow house members to sign up for specific beds each week.
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
                    Enable Bed Sign-Up
                  </Text>
                  <Switch
                    value={bedSignupEnabled}
                    onValueChange={handleBedSignupToggle}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                {bedSignupEnabled && (
                  <>
                    {/* Room Configuration Status */}
                    <View style={styles.bedSignupStatus}>
                      <FontAwesome
                        name={roomCount > 0 ? "check-circle" : "info-circle"}
                        size={16}
                        color={roomCount > 0 ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.bedSignupStatusText,
                          { color: roomCount > 0 ? colors.foreground : colors.mutedForeground },
                        ]}
                      >
                        {roomCount > 0
                          ? `${roomCount} room${roomCount !== 1 ? "s" : ""}, ${bedCount} bed${bedCount !== 1 ? "s" : ""} configured`
                          : "No rooms configured yet"}
                      </Text>
                    </View>

                    {/* Configure Rooms Button */}
                    <TouchableOpacity
                      style={[
                        styles.configureRoomsButton,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => router.push("/room-configuration")}
                    >
                      <FontAwesome
                        name="bed"
                        size={16}
                        color={colors.primaryForeground}
                      />
                      <Text
                        style={[
                          styles.configureRoomsButtonText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        Configure Rooms & Beds
                      </Text>
                    </TouchableOpacity>

                    {/* View History Button */}
                    <TouchableOpacity
                      style={[
                        styles.viewHistoryButton,
                        {
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => router.push("/bed-history")}
                    >
                      <FontAwesome
                        name="history"
                        size={16}
                        color={colors.foreground}
                      />
                      <Text
                        style={[
                          styles.viewHistoryButtonText,
                          { color: colors.foreground },
                        ]}
                      >
                        View Bed History
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Sign-Up Windows Section (only when bed signup is enabled) */}
              {bedSignupEnabled && (
                <View
                  style={[
                    styles.themeCard,
                    { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 },
                  ]}
                >
                  <Text style={[styles.themeLabel, { color: colors.foreground }]}>
                    Sign-Up Windows
                  </Text>

                  {/* Current Status */}
                  {isLoadingWindowStatus ? (
                    <ActivityIndicator size="small" color={colors.foreground} />
                  ) : windowStatus?.activeWindow ? (
                    // Active window
                    <View style={styles.windowStatusSection}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.primary + "20" }]}>
                        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                          SIGN-UP OPEN
                        </Text>
                      </View>
                      <Text style={[styles.windowDateText, { color: colors.foreground }]}>
                        {formatWeekendDates(
                          windowStatus.activeWindow.target_weekend_start,
                          windowStatus.activeWindow.target_weekend_end
                        )} weekend
                      </Text>
                      <Text style={[styles.windowSubtext, { color: colors.mutedForeground }]}>
                        {windowStatus.activeWindow.claimedBeds} of {windowStatus.activeWindow.totalBeds} beds claimed
                      </Text>

                      <TouchableOpacity
                        style={[styles.closeWindowButton, { borderColor: colors.destructive }]}
                        onPress={handleCloseWindow}
                      >
                        <FontAwesome name="times-circle" size={14} color={colors.destructive} />
                        <Text style={[styles.closeWindowButtonText, { color: colors.destructive }]}>
                          Close Sign-Up Early
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : windowStatus?.nextScheduledWindow ? (
                    // Scheduled window
                    <View style={styles.windowStatusSection}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
                        <FontAwesome name="clock-o" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.statusBadgeText, { color: colors.mutedForeground }]}>
                          SCHEDULED
                        </Text>
                      </View>
                      <Text style={[styles.windowDateText, { color: colors.foreground }]}>
                        {formatWeekendDates(
                          windowStatus.nextScheduledWindow.target_weekend_start,
                          windowStatus.nextScheduledWindow.target_weekend_end
                        )} weekend
                      </Text>
                      <Text style={[styles.windowSubtext, { color: colors.mutedForeground }]}>
                        Opens: {formatScheduledTime(windowStatus.nextScheduledWindow.opens_at)}
                      </Text>

                      <TouchableOpacity
                        style={[styles.openNowButton, { backgroundColor: colors.primary }]}
                        onPress={handleOpenWindowNow}
                      >
                        <FontAwesome name="unlock" size={14} color={colors.primaryForeground} />
                        <Text style={[styles.openNowButtonText, { color: colors.primaryForeground }]}>
                          Open Sign-Up Now
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // No window
                    <View style={styles.windowStatusSection}>
                      <Text style={[styles.noWindowText, { color: colors.mutedForeground }]}>
                        No sign-up window scheduled
                      </Text>
                    </View>
                  )}

                  {/* Create Custom Window Button (when no active window) */}
                  {!windowStatus?.activeWindow && (
                    <TouchableOpacity
                      style={[styles.createCustomButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setCustomWeekendStart(getNextFriday());
                        setShowCustomWindowModal(true);
                      }}
                    >
                      <FontAwesome name="plus" size={14} color={colors.foreground} />
                      <Text style={[styles.createCustomButtonText, { color: colors.foreground }]}>
                        Create Custom Window
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Auto-Schedule Toggle */}
                  <View style={[styles.autoScheduleRow, { borderTopColor: colors.border }]}>
                    <View style={styles.autoScheduleInfo}>
                      <Text style={[styles.autoScheduleLabel, { color: colors.foreground }]}>
                        Auto-schedule
                      </Text>
                      <Text style={[styles.autoScheduleHint, { color: colors.mutedForeground }]}>
                        Open at random time Mon/Tue
                      </Text>
                    </View>
                    <Switch
                      value={autoScheduleWindows}
                      onValueChange={handleAutoScheduleToggle}
                      trackColor={{ false: colors.muted, true: colors.primary }}
                      thumbColor={colors.background}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Custom Window Modal */}
            {showCustomWindowModal && (
              <View style={styles.modalOverlay}>
                <View
                  style={[
                    styles.customWindowModal,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                      Create Custom Window
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowCustomWindowModal(false);
                        setCustomWeekendStart(null);
                      }}
                    >
                      <FontAwesome name="times" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={[styles.modalLabel, { color: colors.foreground }]}>
                      Weekend Start (Friday)
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dateButton,
                        { backgroundColor: colors.muted, borderColor: colors.border },
                      ]}
                      onPress={() => setShowCustomDatePicker(true)}
                    >
                      <FontAwesome name="calendar" size={16} color={colors.foreground} />
                      <Text style={[styles.dateText, { color: colors.foreground }]}>
                        {customWeekendStart
                          ? formatDateDisplay(customWeekendStart)
                          : "Select Friday..."}
                      </Text>
                    </TouchableOpacity>

                    {(showCustomDatePicker || Platform.OS === "ios") && (
                      <DateTimePicker
                        value={customWeekendStart || getNextFriday()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(event, date) => {
                          setShowCustomDatePicker(false);
                          if (date) setCustomWeekendStart(date);
                        }}
                        minimumDate={new Date()}
                        style={Platform.OS === "ios" ? styles.iosPicker : undefined}
                      />
                    )}

                    <Text style={[styles.modalHint, { color: colors.mutedForeground }]}>
                      This will immediately open sign-up for the selected weekend.
                    </Text>
                  </View>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalCancelButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setShowCustomWindowModal(false);
                        setCustomWeekendStart(null);
                      }}
                    >
                      <Text style={[styles.modalCancelText, { color: colors.foreground }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalCreateButton,
                        {
                          backgroundColor: customWeekendStart ? colors.primary : colors.muted,
                        },
                      ]}
                      onPress={handleCreateCustomWindow}
                      disabled={!customWeekendStart || isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Text
                          style={[
                            styles.modalCreateText,
                            { color: customWeekendStart ? colors.primaryForeground : colors.mutedForeground },
                          ]}
                        >
                          Create & Open
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Admin Ping Modal */}
      <AdminPingModal
        visible={showAdminPingModal}
        houseId={activeHouse.id}
        houseName={activeHouse.name}
        onClose={() => setShowAdminPingModal(false)}
      />
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
  tabBarContainer: {
    borderBottomWidth: 1,
  },
  tabBarContent: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  tabButtonTextActive: {
    fontFamily: typography.fontFamily.chillaxMedium,
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
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  pickerDoneText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
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
  recipientList: {
    gap: 8,
  },
  recipientOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientAvatarText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  recipientName: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  bedSignupStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  bedSignupStatusText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  configureRoomsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  configureRoomsButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  viewHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  viewHistoryButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  // Window management styles
  windowStatusSection: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxSemibold,
    letterSpacing: 0.5,
  },
  windowDateText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 4,
  },
  windowSubtext: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 12,
  },
  noWindowText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
    marginBottom: 8,
  },
  openNowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  openNowButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  closeWindowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  closeWindowButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  createCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
    marginBottom: 16,
  },
  createCustomButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  autoScheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  autoScheduleInfo: {
    flex: 1,
  },
  autoScheduleLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  autoScheduleHint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  // Custom window modal styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  customWindowModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 12,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  modalCreateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  modalCreateText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  // Notification button styles
  notificationButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  notificationButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationButtonContent: {
    flex: 1,
  },
  notificationButtonTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 2,
  },
  notificationButtonSubtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  // Session booking styles
  sessionBookingField: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  sessionBookingInput: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  sessionBookingTextarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  durationPickerOptions: {
    marginTop: 8,
    gap: 6,
  },
  durationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationOptionText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
