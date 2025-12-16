import { AvatarPicker, ProfileForm } from "@/components/account";
import { GeometricBackground } from "@/components/GeometricBackground";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/api/profile";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type { Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AccountScreen() {
  const colors = useColors();
  const {
    user,
    signOut,
    biometricSupported,
    biometricEnabled,
    biometricName,
    enableBiometric,
    disableBiometric,
  } = useAuth();
  const { activeHouse } = useHouse();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricToggling, setIsBiometricToggling] = useState(false);

  // Check if user is admin of active house
  const isAdmin = activeHouse?.role === "admin";

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { profile: fetchedProfile, error } = await getCurrentProfile();
      if (error) {
        console.error("Error loading profile:", error);
      } else {
        setProfile(fetchedProfile);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: newAvatarUrl });
    }
  };

  const handleProfileUpdate = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleSignOut = () => {
    const doSignOut = () => {
      signOut();
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        doSignOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doSignOut },
      ]);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    setIsBiometricToggling(true);

    if (value) {
      const { error } = await enableBiometric();
      if (error) {
        if (Platform.OS === "web") {
          window.alert(error.message);
        } else {
          Alert.alert("Error", error.message);
        }
      }
    } else {
      await disableBiometric();
    }

    setIsBiometricToggling(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <GeometricBackground />
        <Text style={[styles.loadingHeader, { color: colors.foreground }]}>MÖKKI</Text>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GeometricBackground />
        <TopBar />
        <View style={styles.errorContainer}>
          <FontAwesome
            name="exclamation-circle"
            size={48}
            color={colors.destructive}
          />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Failed to load profile
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadProfile}
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <PageContainer>
      <GeometricBackground />
      <TopBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Manage your profile and settings
          </Text>
        </View>

        {/* Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <AvatarPicker
              avatarUrl={profile.avatar_url}
              displayName={profile.display_name}
              onAvatarChange={handleAvatarChange}
            />
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Profile Form */}
          <ProfileForm
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
          />
        </View>

        {/* House Members Link */}
        <TouchableOpacity
          style={[
            styles.linkButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/members")}
        >
          <View style={styles.linkButtonContent}>
            <FontAwesome name="users" size={18} color={colors.foreground} />
            <Text style={[styles.linkButtonText, { color: colors.foreground }]}>
              House Members
            </Text>
          </View>
          <FontAwesome
            name="chevron-right"
            size={14}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {/* House Settings Link (Admin Only) */}
        {isAdmin && (
          <TouchableOpacity
            style={[
              styles.linkButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push("/house-settings")}
          >
            <View style={styles.linkButtonContent}>
              <FontAwesome name="cog" size={18} color={colors.foreground} />
              <Text style={[styles.linkButtonText, { color: colors.foreground }]}>
                House Settings
              </Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        )}

        {/* Security Settings */}
        {biometricSupported && Platform.OS !== "web" && (
          <View
            style={[
              styles.settingsCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>
              Security
            </Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <FontAwesome
                  name={biometricName === "Face ID" ? "smile-o" : "hand-stop-o"}
                  size={20}
                  color={colors.foreground}
                />
                <View style={styles.settingText}>
                  <Text
                    style={[styles.settingLabel, { color: colors.foreground }]}
                  >
                    {biometricName}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Quick sign-in with {biometricName}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={isBiometricToggling}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>
          </View>
        )}

        {/* Sign Out Section */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={[styles.signOutButton, { borderColor: colors.destructive }]}
            onPress={handleSignOut}
          >
            <FontAwesome name="sign-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>
              Sign Out
            </Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            Mokki Mobile v1.0.0
          </Text>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingHeader: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  avatarSection: {
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  linkButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  settingsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  settingsTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  signOutSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 16,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    width: "100%",
  },
  signOutText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  versionText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
