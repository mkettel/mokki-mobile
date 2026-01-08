import { typography } from "@/constants/theme";
import {
  updateProfile,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_TAGLINE_LENGTH,
  MAX_VENMO_LENGTH,
} from "@/lib/api/profile";
import { useColors } from "@/lib/context/theme";
import type { Profile, RiderType } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RiderTypeSelector } from "./RiderTypeSelector";

interface ProfileFormProps {
  profile: Profile;
  onProfileUpdate: (profile: Profile) => void;
  showRiderType?: boolean;
}

export function ProfileForm({ profile, onProfileUpdate, showRiderType = false }: ProfileFormProps) {
  const colors = useColors();
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [tagline, setTagline] = useState(profile.tagline || "");
  const [venmoHandle, setVenmoHandle] = useState(profile.venmo_handle || "");
  const [riderType, setRiderType] = useState<RiderType | null>(profile.rider_type);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      displayName !== (profile.display_name || "") ||
      tagline !== (profile.tagline || "") ||
      venmoHandle !== (profile.venmo_handle || "") ||
      (showRiderType && riderType !== profile.rider_type);
    setHasChanges(changed);
  }, [displayName, tagline, venmoHandle, riderType, profile, showRiderType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { profile: updatedProfile, error } = await updateProfile({
        display_name: displayName || null,
        tagline: tagline || null,
        venmo_handle: venmoHandle || null,
        ...(showRiderType && { rider_type: riderType }),
      });

      if (error) {
        throw error;
      }

      if (updatedProfile) {
        onProfileUpdate(updatedProfile);
        const message = "Profile updated successfully";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Success", message);
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      const message = error instanceof Error ? error.message : "Failed to save profile";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Email (read-only) */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
        <View
          style={[
            styles.input,
            styles.disabledInput,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.disabledText, { color: colors.mutedForeground }]}>
            {profile.email}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Email cannot be changed
        </Text>
      </View>

      {/* Display Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          Display Name
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          editable={!isSaving}
        />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Shown to other house members
        </Text>
      </View>

      {/* Tagline */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Tagline</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          value={tagline}
          onChangeText={setTagline}
          placeholder="Your motto or favorite quote"
          placeholderTextColor={colors.mutedForeground}
          maxLength={MAX_TAGLINE_LENGTH}
          editable={!isSaving}
        />
      </View>

      {/* Venmo Handle */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          Venmo Username
        </Text>
        <View style={styles.venmoInputContainer}>
          <Text style={[styles.venmoPrefix, { color: colors.mutedForeground }]}>
            @
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.venmoInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={venmoHandle}
            onChangeText={setVenmoHandle}
            placeholder="username"
            placeholderTextColor={colors.mutedForeground}
            maxLength={MAX_VENMO_LENGTH}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
          />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          For expense settlements (visible to house members)
        </Text>
      </View>

      {/* Rider Type */}
      {showRiderType && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Rider Type
          </Text>
          <RiderTypeSelector
            value={riderType}
            onChange={setRiderType}
            disabled={isSaving}
          />
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          {
            backgroundColor: hasChanges ? colors.primary : colors.muted,
            opacity: hasChanges && !isSaving ? 1 : 0.6,
          },
        ]}
        onPress={handleSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <>
            <FontAwesome name="check" size={16} color={colors.primaryForeground} />
            <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  disabledInput: {
    opacity: 0.7,
  },
  disabledText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  hint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  venmoInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  venmoPrefix: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginRight: 4,
  },
  venmoInput: {
    flex: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
