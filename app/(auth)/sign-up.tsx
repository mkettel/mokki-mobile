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
  PasswordInput,
  Label,
} from "@/components/ui";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleSignUp = async () => {
    if (!email || !password || !repeatPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: signUpError } = await signUp(email, password);
    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Please check your email to verify your account.",
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
                <CardTitle>Sign up</CardTitle>
                <CardDescription>Create a new account</CardDescription>
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

                  {/* Password Field */}
                  <View style={styles.fieldGroup}>
                    <Label>Password</Label>
                    <PasswordInput
                      value={password}
                      onChangeText={setPassword}
                      autoComplete="new-password"
                    />
                  </View>

                  {/* Repeat Password Field */}
                  <View style={styles.fieldGroup}>
                    <Label>Repeat Password</Label>
                    <PasswordInput
                      value={repeatPassword}
                      onChangeText={setRepeatPassword}
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
                    onPress={handleSignUp}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? "Creating an account..." : "Sign up"}
                  </Button>

                  {/* Login Link */}
                  <View style={styles.footer}>
                    <Text
                      style={[styles.footerText, { color: colors.foreground }]}
                    >
                      Already have an account?{" "}
                    </Text>
                    <Link href="/(auth)/login" asChild>
                      <TouchableOpacity>
                        <Text
                          style={[
                            styles.loginLink,
                            { color: colors.foreground },
                          ]}
                        >
                          Login
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
