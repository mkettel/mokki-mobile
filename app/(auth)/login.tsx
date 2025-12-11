import { useEffect, useState } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import { FontAwesome } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const {
    signIn,
    biometricSupported,
    biometricEnabled,
    biometricName,
    signInWithBiometric,
  } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Auto-prompt biometric on mount if enabled
  useEffect(() => {
    if (biometricEnabled && biometricSupported) {
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricSupported]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    setError(null);

    const { error: biometricError } = await signInWithBiometric();
    setIsBiometricLoading(false);

    if (biometricError) {
      setError(biometricError.message);
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      router.replace("/(tabs)");
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
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your email below to login to your account
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

                  {/* Password Field */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.passwordHeader}>
                      <Label>Password</Label>
                      <Link href="/(auth)/forgot-password" asChild>
                        <TouchableOpacity>
                          <Text
                            style={[
                              styles.forgotLink,
                              { color: colors.foreground },
                            ]}
                          >
                            Forgot your password?
                          </Text>
                        </TouchableOpacity>
                      </Link>
                    </View>
                    <PasswordInput
                      value={password}
                      onChangeText={setPassword}
                      autoComplete="password"
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
                    onPress={handleLogin}
                    loading={isLoading}
                    disabled={isLoading || isBiometricLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>

                  {/* Biometric Login Button */}
                  {biometricSupported && biometricEnabled && (
                    <TouchableOpacity
                      onPress={handleBiometricLogin}
                      disabled={isBiometricLoading || isLoading}
                      style={[
                        styles.biometricButton,
                        { borderColor: colors.border },
                      ]}
                    >
                      <FontAwesome
                        name={biometricName === "Face ID" ? "smile-o" : "hand-stop-o"}
                        size={20}
                        color={colors.foreground}
                      />
                      <Text
                        style={[
                          styles.biometricButtonText,
                          { color: colors.foreground },
                        ]}
                      >
                        {isBiometricLoading
                          ? "Authenticating..."
                          : `Login with ${biometricName}`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Sign Up Link */}
                  <View style={styles.footer}>
                    <Text
                      style={[styles.footerText, { color: colors.foreground }]}
                    >
                      Don't have an account?{" "}
                    </Text>
                    <Link href="/(auth)/sign-up" asChild>
                      <TouchableOpacity>
                        <Text
                          style={[
                            styles.signUpLink,
                            { color: colors.foreground },
                          ]}
                        >
                          Sign up
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
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  error: {
    fontSize: 14,
  },
  submitButton: {
    width: "100%",
    marginTop: 8,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: "500",
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
  signUpLink: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
