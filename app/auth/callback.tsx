import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL that opened this screen
        const url = await Linking.getInitialURL();
        if (!url) {
          // Try parsing URL from current location
          handleDeepLink(Linking.createURL("auth/callback"));
          return;
        }
        await handleDeepLink(url);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Something went wrong. Please try again.");
      }
    };

    const handleDeepLink = async (url: string) => {
      // Parse the URL to extract tokens
      // Supabase sends tokens in the hash fragment: #access_token=...&refresh_token=...&type=...
      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) {
        // No hash fragment, might be a different type of callback
        // Just redirect to login
        router.replace("/(auth)/login");
        return;
      }

      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (accessToken && refreshToken) {
        // Set the session with the tokens from the URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Failed to verify your email. Please try again.");
          return;
        }

        // Handle different auth event types
        if (type === "recovery") {
          // Password reset - redirect to the password update screen
          router.replace("/(auth)/reset-password");
        } else {
          // Email confirmation (signup) or other
          router.replace("/(tabs)");
        }
      } else {
        // No tokens found, redirect to login
        router.replace("/(auth)/login");
      }
    };

    handleCallback();

    // Also listen for incoming links while the screen is mounted
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text
          style={styles.linkText}
          onPress={() => router.replace("/(auth)/login")}
        >
          Return to Login
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.text}>Verifying...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  linkText: {
    fontSize: 16,
    color: "#2563eb",
    textDecorationLine: "underline",
  },
});
