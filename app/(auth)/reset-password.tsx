import { useState } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Text,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase/client";
import { useColors } from "@/lib/context/theme";
import { GeometricBackground } from "@/components/GeometricBackground";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
} from "@/components/ui";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleUpdatePassword = async () => {
    if (!password) {
      setError("Please enter a new password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      Alert.alert(
        "Password Updated",
        "Your password has been successfully updated.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardContainer}>
            <Card>
              <CardHeader>
                <CardTitle>Set New Password</CardTitle>
                <CardDescription>
                  Enter your new password below
                </CardDescription>
              </CardHeader>

              <CardContent>
                <View style={styles.form}>
                  {/* New Password Field */}
                  <View style={styles.fieldGroup}>
                    <Label>New Password</Label>
                    <Input
                      placeholder="Enter new password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                    />
                  </View>

                  {/* Confirm Password Field */}
                  <View style={styles.fieldGroup}>
                    <Label>Confirm Password</Label>
                    <Input
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="new-password"
                    />
                  </View>

                  {/* Error Message */}
                  {error && (
                    <Text style={[styles.error, { color: colors.destructive }]}>
                      {error}
                    </Text>
                  )}

                  {/* Submit Button */}
                  <Button
                    onPress={handleUpdatePassword}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  form: {
    gap: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  error: {
    fontSize: 14,
  },
  submitButton: {
    width: "100%",
    marginTop: 8,
  },
});
