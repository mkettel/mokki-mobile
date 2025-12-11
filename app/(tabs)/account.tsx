import { TopBar } from "@/components/TopBar";
import { AvatarPicker, ProfileForm } from "@/components/account";
import { typography } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/api/profile";
import { useAuth } from "@/lib/context/auth";
import { useColors } from "@/lib/context/theme";
import type { Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AccountScreen() {
  const colors = useColors();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={48} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Failed to load profile
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadProfile}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Manage your profile and settings
          </Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          <ProfileForm profile={profile} onProfileUpdate={handleProfileUpdate} />
        </View>

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
    </View>
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
    color: "#fff",
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
    fontSize: 14,
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
