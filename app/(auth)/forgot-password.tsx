import { useState } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/context/auth";
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);
    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      Alert.alert(
        "Check your email",
        "We sent you a password reset link. Please check your email.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login"),
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
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a link to reset your
                  password
                </CardDescription>
              </CardHeader>

              <CardContent>
                <View style={styles.form}>
                  {/* Email Field */}
                  <View style={styles.fieldGroup}>
                    <Label>Email</Label>
                    <Input
                      placeholder="m@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
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
                    onPress={handleResetPassword}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  {/* Back to Login Link */}
                  <View style={styles.footer}>
                    <Text
                      style={[styles.footerText, { color: colors.foreground }]}
                    >
                      Remember your password?{" "}
                    </Text>
                    <Link href="/(auth)/login" asChild>
                      <TouchableOpacity>
                        <Text
                          style={[
                            styles.loginLink,
                            { color: colors.foreground },
                          ]}
                        >
                          Sign in
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
