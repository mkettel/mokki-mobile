import { TopBar } from "@/components/TopBar";
import { DEFAULT_FEATURE_CONFIG, FEATURE_ORDER } from "@/constants/features";
import { typography } from "@/constants/theme";
import { updateHouseSettings } from "@/lib/api/house";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { getFeatureConfig } from "@/lib/utils/features";
import type { FeatureId, HouseSettings } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
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
          <TouchableOpacity onPress={handleEditStart} style={styles.labelTouchable}>
            <Text
              style={[
                styles.featureLabel,
                { color: enabled ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {label}
            </Text>
            <FontAwesome
              name="pencil"
              size={12}
              color={colors.mutedForeground}
              style={styles.editIcon}
            />
          </TouchableOpacity>
        )}

        {label !== defaultLabel && !isEditing && (
          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.resetText, { color: colors.mutedForeground }]}>
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
  const { activeHouse, refreshHouses } = useHouse();

  const [isSaving, setIsSaving] = useState(false);
  const [localFeatures, setLocalFeatures] = useState<
    Record<FeatureId, { enabled: boolean; label: string }>
  >({} as Record<FeatureId, { enabled: boolean; label: string }>);

  // Check if user is admin
  const isAdmin = activeHouse?.role === "admin";

  // Initialize local features from house settings
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
    }
  }, [activeHouse]);

  // Redirect if not admin
  useEffect(() => {
    if (activeHouse && !isAdmin) {
      router.back();
    }
  }, [activeHouse, isAdmin, router]);

  const handleFeatureToggle = async (featureId: FeatureId, enabled: boolean) => {
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
            <ActivityIndicator size="small" color={colors.mutedForeground} />
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
          <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>
            Toggle features on or off and customize their labels. Disabled features won't appear in navigation.
          </Text>

          <View style={styles.featuresList}>
            {FEATURE_ORDER.map((featureId) => (
              <FeatureRow
                key={featureId}
                featureId={featureId}
                enabled={localFeatures[featureId]?.enabled ?? true}
                label={localFeatures[featureId]?.label ?? DEFAULT_FEATURE_CONFIG[featureId].label}
                defaultLabel={DEFAULT_FEATURE_CONFIG[featureId].label}
                onToggle={(enabled) => handleFeatureToggle(featureId, enabled)}
                onLabelChange={(label) => handleLabelChange(featureId, label)}
              />
            ))}
          </View>
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
});
