import { typography } from "@/constants/theme";
import { joinHouseWithCode } from "@/lib/api/members";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type JoinStatus = "loading" | "success" | "error" | "not_authenticated";

export default function InviteScreen() {
  const colors = useColors();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { refreshHouses } = useHouse();

  const [status, setStatus] = useState<JoinStatus>("loading");
  const [houseName, setHouseName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("not_authenticated");
      return;
    }

    if (code) {
      handleJoinHouse();
    }
  }, [code, user, authLoading]);

  const handleJoinHouse = async () => {
    if (!code) return;

    setStatus("loading");
    setErrorMessage(null);

    const { success, houseName: name, error } = await joinHouseWithCode(code);

    if (success) {
      setHouseName(name);
      setStatus("success");
      // Refresh the house list
      await refreshHouses();
    } else {
      setErrorMessage(error?.message || "Failed to join house");
      setStatus("error");
    }
  };

  const handleGoToLogin = () => {
    // Navigate to login with the invite code preserved
    router.replace(`/(auth)/login?redirect=/invite/${code}`);
  };

  const handleGoToHouse = () => {
    router.replace("/(tabs)");
  };

  const handleRetry = () => {
    handleJoinHouse();
  };

  const handleGoHome = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        {status === "loading" && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Joining house...
            </Text>
          </View>
        )}

        {status === "not_authenticated" && (
          <View style={styles.centerContent}>
            <View
              style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}
            >
              <FontAwesome name="user" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Sign In Required
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              You need to sign in or create an account to join this house.
            </Text>
            <View style={styles.codeBox}>
              <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
                Invite Code
              </Text>
              <Text style={[styles.codeText, { color: colors.foreground }]}>
                {code}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleGoToLogin}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Sign In to Join
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "success" && (
          <View style={styles.centerContent}>
            <View
              style={[styles.iconCircle, { backgroundColor: "#16a34a20" }]}
            >
              <FontAwesome name="check" size={32} color="#16a34a" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Welcome!
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              You&apos;ve successfully joined {houseName || "the house"}!
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleGoToHouse}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Go to House
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "error" && (
          <View style={styles.centerContent}>
            <View
              style={[styles.iconCircle, { backgroundColor: colors.destructive + "20" }]}
            >
              <FontAwesome name="exclamation-circle" size={32} color={colors.destructive} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Unable to Join
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {errorMessage}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleGoHome}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                  Go Home
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleRetry}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  centerContent: {
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 16,
  },
  codeBox: {
    alignItems: "center",
    marginVertical: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    letterSpacing: 3,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});
