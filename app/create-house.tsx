import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/lib/context/theme";
import { useHouse } from "@/lib/context/house";
import { createHouse } from "@/lib/api/house";
import { joinHouseWithCode } from "@/lib/api/members";
import { GeometricBackground } from "@/components/GeometricBackground";
import { typography } from "@/constants/theme";
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

export default function CreateHouseScreen() {
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshHouses } = useHouse();

  const handleCreateHouse = async () => {
    if (!name.trim()) {
      setError("Please enter a house name");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { house, error: createError } = await createHouse(name);

    if (createError) {
      setError(createError.message);
      setIsLoading(false);
      return;
    }

    // Refresh houses in context
    await refreshHouses();

    setIsLoading(false);

    // Navigate to dashboard
    router.replace("/(tabs)");
  };

  const handleJoinWithCode = async () => {
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      setJoinError("Please enter an invite code");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    const { success, houseName, error: joinErr } = await joinHouseWithCode(code);

    if (joinErr) {
      setJoinError(joinErr.message);
      setIsJoining(false);
      return;
    }

    if (success) {
      // Refresh houses in context
      await refreshHouses();

      setIsJoining(false);

      // Show success message
      const message = houseName
        ? `You've joined "${houseName}"!`
        : "You've joined the house!";

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Welcome!", message);
      }

      // Navigate to dashboard
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
            {/* Join with Code Card */}
            <Card style={styles.card}>
              <CardHeader>
                <CardTitle>Join a House</CardTitle>
                <CardDescription>
                  Have an invite code? Enter it below to join an existing house.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Label>Invite Code</Label>
                    <Input
                      placeholder="e.g., ABC123XY"
                      value={inviteCode}
                      onChangeText={(text) => {
                        setInviteCode(text.toUpperCase());
                        setJoinError(null);
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={8}
                      style={styles.codeInput}
                    />
                  </View>

                  {joinError && (
                    <Text style={[styles.error, { color: colors.destructive }]}>
                      {joinError}
                    </Text>
                  )}

                  <Button
                    onPress={handleJoinWithCode}
                    loading={isJoining}
                    disabled={isJoining || !inviteCode.trim()}
                    style={styles.submitButton}
                  >
                    {isJoining ? "Joining..." : "Join House"}
                  </Button>
                </View>
              </CardContent>
            </Card>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                or
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Create House Card */}
            <Card style={styles.card}>
              <CardHeader>
                <CardTitle>Create Your House</CardTitle>
                <CardDescription>
                  Start a new house and invite your friends to join.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Label>House Name</Label>
                    <Input
                      placeholder="e.g., Powder Palace, Ski Chalet"
                      value={name}
                      onChangeText={(text) => {
                        setName(text);
                        setError(null);
                      }}
                      autoCapitalize="words"
                    />
                  </View>

                  {error && (
                    <Text style={[styles.error, { color: colors.destructive }]}>
                      {error}
                    </Text>
                  )}

                  <Button
                    onPress={handleCreateHouse}
                    loading={isLoading}
                    disabled={isLoading || !name.trim()}
                    style={styles.submitButton}
                  >
                    {isLoading ? "Creating..." : "Create House"}
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
  card: {
    marginBottom: 0,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  codeInput: {
    letterSpacing: 4,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textAlign: "center",
    fontSize: 18,
  },
  error: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  submitButton: {
    width: "100%",
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
});
